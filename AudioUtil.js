function createFadeBuffer(context, activeTime, fadeTime) {
    let length1 = activeTime * context.sampleRate;
    let length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    let length = length1 + length2;
    let buffer = context.createBuffer(1, length, context.sampleRate);
    let p = buffer.getChannelData(0);

    let fadeLength = fadeTime * context.sampleRate;

    let fadeIndex1 = fadeLength;
    let fadeIndex2 = length1 - fadeLength;

    for (let i = 0; i < length1; ++i) {
        let value;

        if (i < fadeIndex1) {
            value = Math.sqrt(i / fadeLength);
        } else if (i >= fadeIndex2) {
            value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
        } else {
            value = 1;
        }

        p[i] = value;
    }

    for (let i = length1; i < length; ++i) {
        p[i] = 0;
    }

    return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    let length1 = activeTime * context.sampleRate;
    let length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    let length = length1 + length2;
    let buffer = context.createBuffer(1, length, context.sampleRate);
    let p = buffer.getChannelData(0);

    for (let i = 0; i < length1; ++i) {
        if (shiftUp) p[i] = (length1 - i) / length;
        else p[i] = i / length1;
    }

    for (let i = length1; i < length; ++i) {
        p[i] = 0;
    }

    return buffer;
}

let delayTime = 0.1;
let fadeTime = 0.05;
let bufferTime = 0.1;

function AudioUtil(context) {
    this.context = context;
    let input = context.createGain();
    let output = context.createGain();
    this.input = input;
    this.output = output;

    this.previousPitch = 0;

    let mod1 = context.createBufferSource();
    let mod2 = context.createBufferSource();
    let mod3 = context.createBufferSource();
    let mod4 = context.createBufferSource();
    this.shiftDownBuffer = createDelayTimeBuffer(
        context,
        bufferTime,
        fadeTime,
        false
    );
    this.shiftUpBuffer = createDelayTimeBuffer(
        context,
        bufferTime,
        fadeTime,
        true
    );
    mod1.buffer = this.shiftDownBuffer;
    mod2.buffer = this.shiftDownBuffer;
    mod3.buffer = this.shiftUpBuffer;
    mod4.buffer = this.shiftUpBuffer;
    mod1.loop = true;
    mod2.loop = true;
    mod3.loop = true;
    mod4.loop = true;

    let mod1Gain = context.createGain();
    let mod2Gain = context.createGain();
    let mod3Gain = context.createGain();
    mod3Gain.gain.value = 0;
    let mod4Gain = context.createGain();
    mod4Gain.gain.value = 0;

    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod3.connect(mod3Gain);
    mod4.connect(mod4Gain);

    let modGain1 = context.createGain();
    let modGain2 = context.createGain();

    let delay1 = context.createDelay(5);
    let delay2 = context.createDelay(5);
    mod1Gain.connect(modGain1);
    mod2Gain.connect(modGain2);
    mod3Gain.connect(modGain1);
    mod4Gain.connect(modGain2);
    modGain1.connect(delay1.delayTime);
    modGain2.connect(delay2.delayTime);

    let fade1 = context.createBufferSource();
    let fade2 = context.createBufferSource();
    let fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
    fade1.buffer = fadeBuffer;
    fade2.buffer = fadeBuffer;
    fade1.loop = true;
    fade2.loop = true;

    let mix1 = context.createGain();
    let mix2 = context.createGain();
    mix1.gain.value = 0;
    mix2.gain.value = 0;

    fade1.connect(mix1.gain);
    fade2.connect(mix2.gain);

    input.connect(delay1);
    input.connect(delay2);
    delay1.connect(mix1);
    delay2.connect(mix2);
    mix1.connect(output);
    mix2.connect(output);

    let t = context.currentTime + 0.05;
    let t2 = t + bufferTime - fadeTime;
    mod1.start(t);
    mod2.start(t2);
    mod3.start(t);
    mod4.start(t2);
    fade1.start(t);
    fade2.start(t2);

    this.mod1 = mod1;
    this.mod2 = mod2;
    this.mod1Gain = mod1Gain;
    this.mod2Gain = mod2Gain;
    this.mod3Gain = mod3Gain;
    this.mod4Gain = mod4Gain;
    this.modGain1 = modGain1;
    this.modGain2 = modGain2;
    this.fade1 = fade1;
    this.fade2 = fade2;
    this.mix1 = mix1;
    this.mix2 = mix2;
    this.delay1 = delay1;
    this.delay2 = delay2;

    this.setDelay(delayTime);
}

AudioUtil.prototype.setDelay = function (delayTime) {
    this.modGain1.gain.setTargetAtTime(
        0.5 * delayTime,
        this.context.currentTime,
        0.01
    );
    this.modGain2.gain.setTargetAtTime(
        0.5 * delayTime,
        this.context.currentTime,
        0.01
    );
};

let previousPitch = -1;

AudioUtil.prototype.setPitchOffset = function (mult, transpose) {
    if (transpose) {
        mult = this.transpose(mult / 2);
    }
    if (mult > 0) {
        this.mod1Gain.gain.value = 0;
        this.mod2Gain.gain.value = 0;
        this.mod3Gain.gain.value = 1;
        this.mod4Gain.gain.value = 1;
    } else {
        this.mod1Gain.gain.value = 1;
        this.mod2Gain.gain.value = 1;
        this.mod3Gain.gain.value = 0;
        this.mod4Gain.gain.value = 0;
    }
    this.setDelay(delayTime * Math.abs(mult));
    this.previousPitch = mult;
    previousPitch = mult;
};

AudioUtil.prototype.transpose = function (x) {
    if (x < 0) {
        return x / 12;
    } else if (x == 0) {
        return 0;
    } else {
        let a5 = 1.8149080040913423e-7;
        let a4 = -0.000019413043101157434;
        let a3 = 0.0009795096626987743;
        let a2 = -0.014147877819596033;
        let a1 = 0.23005591195033048;
        let a0 = 0.02278153473118749;

        let x1 = x;
        let x2 = x * x;
        let x3 = x * x * x;
        let x4 = x * x * x * x;
        let x5 = x * x * x * x * x;

        return a0 + x1 * a1 + x2 * a2 + x3 * a3 + x4 * a4 + x5 * a5;
    }
};
