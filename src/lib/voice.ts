/**
 * Text-to-speech voice assistant for reception attendance announcements
 */

let voiceEnabled = true;

export function setVoiceEnabled(enabled: boolean) {
  voiceEnabled = enabled;
  try {
    localStorage.setItem('gym_voice_enabled', enabled ? 'true' : 'false');
  } catch (e) {}
}

export function isVoiceEnabled(): boolean {
  try {
    const saved = localStorage.getItem('gym_voice_enabled');
    if (saved !== null) {
      voiceEnabled = saved === 'true';
    }
  } catch (e) {}
  return voiceEnabled;
}

export function speakMessage(message: string) {
  if (!voiceEnabled) return;
  if (!('speechSynthesis' in window)) {
    console.log('[WebSpeech] Speech synthesis not supported in this browser.');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any overlapping voice
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Optional: prefer a clean English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural'))
    );
    if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
