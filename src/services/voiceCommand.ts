// src/services/voiceCommand.ts

export interface FarmingCommand {
  action: 'turn_on_motor' | 'turn_off_motor' | 'schedule_irrigation' | 'get_status' | 'unknown';
  time?: string;
  date?: string;
}

export async function interpretCommand(transcript: string): Promise<FarmingCommand> {
  const text = transcript.toLowerCase();
  
  const onKeywords = ['chalu', 'shuru', 'start', 'on', 'चालू', 'शुरू'];
  const offKeywords = ['band', 'rok', 'stop', 'off', 'बंद', 'रोक'];
  const targetKeywords = ['motor', 'pump', 'paani', 'water', 'मोटर', 'पंप', 'पानी'];

  const hasOn = onKeywords.some(word => text.includes(word));
  const hasOff = offKeywords.some(word => text.includes(word));
  const hasTarget = targetKeywords.some(word => text.includes(word));

  if (hasOn && hasTarget) return { action: 'turn_on_motor' };
  if (hasOff && hasTarget) return { action: 'turn_off_motor' };
  if (text.includes('status') || text.includes('halat')) return { action: 'get_status' };

  return { action: 'unknown' };
}