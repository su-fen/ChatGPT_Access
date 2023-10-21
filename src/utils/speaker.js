const sdk = require("microsoft-cognitiveservices-speech-sdk");
const subscriptionKey = "";
const serviceRegion = "eastus";
const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
function textToSpeech(ssmlText,voiceConfig) {
    speechConfig.speechSynthesisVoiceName = voiceConfig.model;
    return new Promise((resolve, reject) => {
        const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
        synthesizer.speakSsmlAsync(
            ssmlText,
            (result) => {
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log(`Speech synthesized for text: ${ssmlText}`);
                    resolve({status:"success",data:Buffer.from(result.audioData.slice())});
                } else {
                    // console.error(`Error synthesizing speech for text "${ssmlText}"`, result.errorDetails);
                    reject({status:"error"});
                }
                synthesizer.close();
            },
            (error) => {
                // console.error(`Error synthesizing speech: ${error}`);
                synthesizer.close();
                reject({status:"error",data:error});
            }
        );
    });
}


export default {
    textToSpeech
}
