// 自製普通背景人物；關係種類共用。經典的原創背景同行不冒稱原著具名角色。
export const ORIGIN_RELATIONS={family:{text:'家人，與你相依為命',aff:45},village:{text:'同鄉，一起離鄉開山',aff:30},rescued:{text:'曾受你搭救，願同行還恩',aff:30},debt:{text:'欠你人情，來山上做活抵還',aff:30},work:{text:'曾一起做活，知道彼此的難處',aff:30}};
export const CLASSIC_ORIGINS={
 guojing:[['李萍','family',false],['草原牧友','village',true]],
 weixiaobao:[['麗春院伙計','work',true],['揚州鄰人','village',true]],
 linghuchong:[['華陰酒肆伙計','work',true],['山中樵夫','rescued',true]],
 yuebuqun:[['華山灶房伙夫','work',true],['山腳挑夫','debt',true]],
 zhangwuji:[['蝴蝶谷藥童','work',true],['山村鄰人','rescued',true]],
 axing:[['肥仔聰','village',false],['街坊鞋匠','work',true]],
};
const CUSTOM_ORIGINS=[ [['阿禾','village'],['石生','debt']], [['小滿','rescued'],['阿青','work']], [['阿墨','work'],['小遠','village']] ];
export function originPeople(heroId=null,origin=0){return (CLASSIC_ORIGINS[heroId]||CUSTOM_ORIGINS[origin]||CUSTOM_ORIGINS[0]).map(([name,relation,invented=true],i)=>({id:`origin-${i+1}`,name,relation,invented,originRelation:ORIGIN_RELATIONS[relation].text,personality:i?['honest','gentle']:['diligent','kind'],root:3,wu:3,style:'palm',adult:true,sprite:i?'junior':'senior',traits:{},skills:{leg:0,palm:0,strength:10,agility:10,farming:4,herbal:4,cooking:4}}));}
