'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [status, setStatus] = useState('Ready to start');
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcriptText = event.results[current][0].transcript;

        if (event.results[current].isFinal) {
          setTranscript('');
          handleUserSpeech(transcriptText);
        } else {
          setTranscript(transcriptText);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setStatus(`Error: ${event.error}`);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleUserSpeech = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setStatus('Processing...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.message };
      setMessages(prev => [...prev, assistantMessage]);

      await speakText(data.message);
      setStatus('Listening...');
    } catch (error) {
      console.error('Error:', error);
      setStatus('Error processing request');
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      await new Promise((resolve, reject) => {
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play();
      });
    } catch (error) {
      console.error('TTS Error:', error);
      const utterance = new SpeechSynthesisUtterance(text);
      await new Promise(resolve => {
        utterance.onend = resolve;
        window.speechSynthesis.speak(utterance);
      });
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setStatus('Speech recognition not supported');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setStatus('Stopped');
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setStatus('Listening...');
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setStatus('Ready to start');
    setTranscript('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">AI Agent Calling</h1>
            <p className="text-blue-100">Voice-enabled AI assistant</p>
          </div>

          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{status}</span>
              </div>
              {isSpeaking && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-4 bg-blue-500 animate-pulse"></div>
                  <div className="w-2 h-6 bg-blue-500 animate-pulse delay-75"></div>
                  <div className="w-2 h-4 bg-blue-500 animate-pulse delay-150"></div>
                </div>
              )}
            </div>

            {transcript && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{transcript}"</p>
              </div>
            )}

            <div className="mb-6 h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-20">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p>Start a conversation by clicking the microphone button</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={toggleListening}
                disabled={isSpeaking}
                className={`flex-1 py-4 px-6 rounded-xl font-semibold text-white transition-all transform hover:scale-105 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isListening ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    )}
                  </svg>
                  <span>{isListening ? 'Stop' : 'Start Call'}</span>
                </div>
              </button>

              <button
                onClick={clearConversation}
                className="py-4 px-6 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
              Click "Start Call" and speak to begin your conversation with the AI agent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
