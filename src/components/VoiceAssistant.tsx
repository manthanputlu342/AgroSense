// src/components/VoiceAssistant.tsx

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { interpretCommand, FarmingCommand } from '../services/voiceCommand';


interface VoiceAssistantProps {
  onCommand: (command: FarmingCommand) => void;
}

// This component provides a voice command interface to control the application.
export default function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState('Click the mic to start (Hindi supported)');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support for the Web Speech API.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback('Voice recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'hi-IN'; // Set to Hindi
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setFeedback('Listening (Hindi)...');
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isProcessing) {
        setFeedback('Click the mic to start');
      }
    };

    recognition.onerror = (event: any) => {
      setFeedback(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setFeedback(`Processing: "${transcript}"...`);
        setIsProcessing(true);
        
        const interpreted = await interpretCommand(transcript);
        
        if (interpreted.action === 'unknown') {
          setFeedback(`Could not understand: "${transcript}"`);
        } else {
          setFeedback(`Action: ${interpreted.action}`);
          onCommand(interpreted);
        }
        setIsProcessing(false);
    };

    recognitionRef.current = recognition;

    // Cleanup function to stop recognition if the component unmounts.
    return () => {
      recognition.stop();
    };
  }, [onCommand]);

  // Toggles the listening state of the speech recognition.
  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center space-y-3">
      <h2 className="text-lg font-medium text-gray-600">Voice Control</h2>
      <button
        onClick={handleToggleListening}
        disabled={isProcessing}
        className={`p-4 rounded-full transition-colors duration-200 ${isListening ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isProcessing ? <Loader2 size={28} className="animate-spin" /> : (isListening ? <MicOff size={28} /> : <Mic size={28} />)}
      </button>
      <p className="text-sm text-gray-500 h-5">{feedback}</p>
    </div>
  );
}
