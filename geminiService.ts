
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Language, DictionaryEntry } from './types.ts';

/**
 * Translates and linguistically analyzes text with Dialect Discrimination.
 */
export async function getAutonomousTranslation(text: string, sourceLang: Language): Promise<DictionaryEntry | null> {
  // Initialize with direct process.env.API_KEY reference
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const targetLang = sourceLang === Language.ENGLISH ? Language.OSHIKWANYAMA : Language.ENGLISH;
  
  const systemInstruction = `You are a Lead Linguist for Northern Namibian languages. 
  Your primary mission is to distinguish between Oshikwanyama and Oshidonga.
  Rule 1: If the user provides an Oshidonga word but expects Oshikwanyama, flag it. 
  Example: "ongulohi" is Oshidonga; the Oshikwanyama equivalent is "onguloshi" (Evening).
  Rule 2: Provide a full linguistic analysis for the Knowledge Vault.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Input: "${text}" | Source: ${sourceLang} | Target: ${targetLang}. 
                 Is this word actually from a different dialect (e.g. Oshidonga)? 
                 Analyze and return the correct Oshikwanyama form.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            oshikwanyama_word: { type: Type.STRING },
            english_word: { type: Type.STRING },
            omaludi_oitja: { type: Type.STRING },
            word_types: { type: Type.STRING },
            oshitya_metumbulo: { type: Type.STRING },
            word_in_phrase_sentence: { type: Type.STRING },
            detected_dialect: { 
              type: Type.STRING, 
              description: "Specify 'oshikwanyama' or 'oshidonga' or 'english'" 
            },
            dialect_correction_note: { 
              type: Type.STRING, 
              description: "Explain if it was Oshidonga and what the correction was." 
            }
          },
          required: ["oshikwanyama_word", "english_word", "omaludi_oitja", "word_types", "oshitya_metumbulo", "word_in_phrase_sentence"]
        }
      }
    });

    // Extracting text output from GenerateContentResponse using .text property
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(responseText.trim());
  } catch (e: any) {
    console.error("Neural synthesis failed:", e);
    return null;
  }
}

async function playAudio(base64: string) {
  const decode = (b64: string) => {
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(decode(base64), audioCtx, 24000, 1);
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioCtx.destination);
  source.start();
}

export async function speakText(text: string) {
  if (!text) return;
  // Initialize with direct process.env.API_KEY reference
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) await playAudio(base64Audio);
  } catch (error) {
    console.warn("TTS Failed, falling back to system speech");
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}
