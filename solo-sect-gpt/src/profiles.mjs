// M34 public introductions for this game's four openings, 小禾 and 阿木 (shape and sanitizer from vendor/public/6f959f5, see SOURCES.md).
// Interface text only: never passed to createWorld, never saved. Bound by opening template or actor id, never by display name.
import{sanitizeProfile}from'../vendor/public/6f959f5/character-card/contract.mjs';
// Borrowed short lines: lalagrass/earth-ascension@6f959f5 sect-chronicle/character-card/profiles.mjs (guojing, linghuchong); see SOURCES.md.
const opening=(profileId,spec)=>[profileId,{visibility:'public',playable:true,edition:'本版開局',storyStage:'未成名，帶著破廳與兩個人立門',designId:'gpt.opening.'+spec.templateId,...spec}];
const member=(profileId,spec)=>[profileId,{visibility:'public',playable:false,work:'本作',edition:'本版開局同住',source:{kind:'本版',ref:'本版新寫'},...spec}];
const PROFILES=Object.fromEntries([
 opening('gpt-custom',{templateId:'custom',displayName:'自創掌門',work:'本作',portraitAssetId:'person.hero.sheet',
  shortIntro:'由你取名的掌門，沒有原作，也沒有預設的過去。',
  background:'破廳、雇工阿木和年幼的小禾，就是這一門的全部家當。名字、配點與性向都是開局時你定的；之後會成為怎樣的人，看本局實際做過的事。',
  source:{kind:'本版',ref:'本版新寫'}}),
 opening('gpt-guo',{templateId:'guo',displayName:'郭靖',work:'射雕英雄傳',
  shortIntro:'蒙古草原上長大的老實少年，吃飯香，性子韌，學會的事情就一遍遍練。',
  background:'本局的他還沒有名聲，從一間破廳和兩個同住的人開始。介紹只寫這時候看得到的性情：老實、肯下苦功、不耍滑；他會什麼、練到哪裡，以本局的紀錄為準。',
  source:{kind:'改編',ref:'短介借自公版研究目錄的郭靖（草原初學階段）；背景為本版改寫'}}),
 opening('gpt-linghu',{templateId:'linghu',displayName:'令狐沖',work:'笑傲江湖',
  shortIntro:'愛喝酒，也愛自由，學東西常常靠看和想。',
  background:'本局的他還沒有名聲，帶著一身灑脫來撐起這間破廳。性情是他的味道，不是一項戰力；之後學會什麼，看本局實際練過的。',
  source:{kind:'改編',ref:'短介取自公版研究目錄的令狐沖（初學階段），刪去師門身分；背景為本版改寫'}}),
 opening('gpt-yue',{templateId:'yue',displayName:'岳不群',work:'笑傲江湖',
  shortIntro:'讀書人模樣的劍客，講規矩，重門面，待人客氣周到。',
  background:'本局的他還沒有掌過任何門派，從破廳和兩個同住的人開始，規矩要一條條立起來。介紹只寫外人看得到的樣子。',
  source:{kind:'改編',ref:'本版新寫，只取原作人物外人看得到的形象'}}),
 member('gpt-child',{displayName:'小禾',actorId:'child',designId:'gpt.member.child',storyStage:'在破廳長大的孩子',
  shortIntro:'在破廳長大的孩子，愛跟在大人身後，看人挑水、劈柴、練拳。',
  background:'她的日子是陪伴、聊天和跟著看；大人的勞作與練功不找她。她和掌門怎麼相處、長成什麼樣子，以本局的家庭與相處紀錄為準。'}),
 member('gpt-amu',{displayName:'阿木',actorId:'amu',designId:'gpt.member.amu',storyStage:'雇來幫忙的工人',
  shortIntro:'山下雇來的工人，手腳勤快，話不多，挑水砍柴都做得來。',
  background:'他是來做工的，不是天生的門人；要不要留下來、成為門中一員，看你們一起過的日子。'})]);
const BY_TEMPLATE={custom:'gpt-custom',guo:'gpt-guo',linghu:'gpt-linghu',yue:'gpt-yue'},BY_ACTOR={child:'gpt-child',amu:'gpt-amu'};
export function publicProfile(id){const raw=PROFILES[id];return raw?sanitizeProfile({...raw,profileId:id}):null;}
export const profileForTemplate=template=>publicProfile(BY_TEMPLATE[template]);
// The leader follows the world's opening template (old saves without one: the canonical identity, else custom); child/amu follow their actor id. Visitors and others have none.
export function profileForPerson(w,id){const p=w?.people?.[id];if(!p)return null;if(id==='leader'){const t=Object.hasOwn(BY_TEMPLATE,w.template)?w.template:Object.hasOwn(BY_TEMPLATE,p.canonicalIdentity)?p.canonicalIdentity:'custom';return profileForTemplate(t);}return Object.hasOwn(BY_ACTOR,id)?publicProfile(BY_ACTOR[id]):null;}
