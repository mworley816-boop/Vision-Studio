import {addScene,normalizeStoryboard} from './visual-editor.mjs';
/** Parses numbered storyboard text; no generation or network calls. */
export function parsePastedStoryboard(text,{defaultDuration=15,maxScenes=100}={}){
 if(typeof text!=='string'||!text.trim()||text.length>100000)throw Error('Paste storyboard text (maximum 100,000 characters)');
 const lines=text.replace(/\r\n?/g,'\n').split('\n');
 const entries=[];let current=null;
 const heading=/^\s*(?:#{1,5}\s*)?(?:\*\*)?(?:scene\s*)?(\d{1,3})\s*(?:\*\*)?\s*[.):-]\s*(.*)$/i;
 const timed=/^\s*(?:duration\s*:\s*)?(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\s*$/i;
 const range=/^\s*(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})\s*$/;
 function finish(){if(!current)return;const description=current.lines.join(' ').replace(/\s+/g,' ').trim();if(!description)throw Error('Scene '+current.number+' has no description');entries.push({number:current.number,description,duration:current.duration??defaultDuration});}
 for(const line of lines){
  const match=line.match(heading);
  if(match){
   finish();current={number:Number(match[1]),lines:[],duration:null};
   if(match[2])current.lines.push(match[2]);continue;
  }
  if(!current){if(line.trim())throw Error('Start each scene with a numbered heading such as Scene 1: Opening');continue;}
  const duration=line.match(timed);
  if(duration){current.duration=Number(duration[1]);continue;}
  const timing=line.match(range);
  if(timing){const a=Number(timing[1])*60+Number(timing[2]),b=Number(timing[3])*60+Number(timing[4]);current.duration=b-a;continue;}
  if(line.trim())current.lines.push(line.trim());
 }
 finish();
 if(!entries.length)throw Error('No numbered scenes found. Use Scene 1: Description');
 if(entries.length>maxScenes)throw Error('Too many scenes (maximum '+maxScenes+')');
 for(const [index,entry] of entries.entries()){
  if(entry.number!==index+1)throw Error('Scene numbers must run from 1 to '+entries.length+' in order');
  if(!Number.isFinite(entry.duration)||entry.duration<=0||entry.duration>420)throw Error('Scene '+entry.number+' duration must be between 0 and 420 seconds');
  if(entry.description.length>3000)throw Error('Scene '+entry.number+' description exceeds 3,000 characters');
 }
 return entries;
}
export function importPastedStoryboard(document,entries,{replace=false}={}){
 let result=replace?{...normalizeStoryboard(document),scenes:[]}:normalizeStoryboard(document);
 for(const entry of entries)result=addScene(result,{description:entry.description,duration:entry.duration});
 return result;
}
