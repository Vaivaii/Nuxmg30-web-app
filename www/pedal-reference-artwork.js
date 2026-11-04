/* Locally rendered, reference-led pedal hardware artwork for MG30 Studio.
 * This file is visual-only. It does not read or write MIDI, SysEx, model indices or parameters.
 */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
  const R = (x,y,w,h,fill,stroke='#252b2e',sw=1.4,rx=4,extra='') =>
    '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+extra+'/>';
  const C = (x,y,r,fill,stroke='#171b1d',sw=1,extra='') =>
    '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" '+extra+'/>';
  const P = (d,stroke='#202629',sw=1.4,fill='none',extra='') =>
    '<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'" stroke-linecap="round" stroke-linejoin="round" '+extra+'/>';
  const T = (x,y,value,size=8,fill='#171c1e',weight=700,anchor='middle',extra='') =>
    '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" fill="'+fill+'" font-family="Arial,Helvetica,sans-serif" font-size="'+size+'" font-weight="'+weight+'" '+extra+'>'+esc(value)+'</text>';
  const S = (x,y,value,size=16,fill='#f5f0e5',anchor='middle') =>
    '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" fill="'+fill+'" font-family="Brush Script MT,Segoe Script,cursive" font-size="'+size+'" font-style="italic" font-weight="bold">'+esc(value)+'</text>';
  const screw=(x,y)=>C(x,y,2.2,'#121719','#c5cbc4',.8)+P('M'+(x-1.1)+' '+y+'h2.2','#e6e8df',.55);
  const jack=(x,y,r=4)=>C(x,y,r+2,'#101416','#6d7776',1)+C(x,y,r-1,'#06090a','#a9b0ac',.7)+C(x,y,1,'#c4c8c0','none',0);
  const led=(x,y,color='#dc3734',r=3)=>C(x,y,r+2.2,'#171a1c','#8a918c',.8)+C(x,y,r,color,'#522b2c',.5)+C(x-1,y-1,Math.max(1,r*.35),'#fff','none',0,'opacity=".5"');
  const knob=(x,y,r=8,face='#d5d6cf',angle=-35)=>{
    let ticks='';
    for(let i=0;i<9;i++){const a=(-135+i*33.75)*Math.PI/180, x1=x+Math.cos(a)*(r+3), y1=y+Math.sin(a)*(r+3), x2=x+Math.cos(a)*(r+5), y2=y+Math.sin(a)*(r+5);ticks+=P('M'+x1.toFixed(1)+' '+y1.toFixed(1)+'L'+x2.toFixed(1)+' '+y2.toFixed(1),'#202628',.8);}
    return '<g>'+ticks+C(x,y,r+2.2,'#121719','#777d79',.8)+C(x,y,r,'#0a0d0f','#303738',.65)+C(x,y,r*.72,face,'#606866',.75)+P('M'+x+' '+(y-r*.62)+'v'+(r*.55),'#151a1b',1.7,'none','transform="rotate('+angle+' '+x+' '+y+')"')+C(x,y,1.1,'#737b79','none',0)+'</g>';
  };
  const ivory=(x,y,r=8,angle=-35)=>{
    return '<g>'+C(x,y,r+2,'#17191a','#777a72',.8)+C(x,y,r,'#e9e0c9','#aaa18f',.8)+P('M'+x+' '+(y-r+1)+'v'+(r*.63),'#282b28',1.7,'none','transform="rotate('+angle+' '+x+' '+y+')"')+'</g>';
  };
  const metalSwitch=(x,y,r=5)=>'<g>'+C(x,y,r+3,'#171b1d','#c0c5bd',1)+C(x,y,r,'url(#pa-metal)','#6c7472',.7)+P('M'+x+' '+(y+1)+'l-3 -8','#eef0e7',2.2)+'</g>';
  const foot=(x=210,y=210,r=11)=>'<g>'+C(x,y,r+4,'#171a1c','#8a9391',1.4)+C(x,y,r+1,'url(#pa-metal)','#e2e5dd',1)+C(x,y,r-3,'#515a5d','#171b1d',1)+C(x,y,2.3,'#171b1d','none',0)+'</g>';
  const bossLogo=(x=210,y=224,fill='#111719',size=16)=>T(x,y,'BOSS',size,fill,900,'middle','letter-spacing="2" stroke="#060809" stroke-width=".3"');
  const vcase=(body='#c6c9c6',edge='#59615f')=>R(143,3,134,244,body,edge,2,9)+R(149,9,122,232,'none','#fff',.55,6,'opacity=".28"')+screw(151,13)+screw(269,13)+screw(151,236)+screw(269,236);
  const boss=(o={})=>{
    let s=vcase(o.body||'#c6c9c6',o.edge||'#59615f');
    s+=R(150,10,120,o.topH||91,o.top||'#b9c4c0',o.topStroke||'#67716d',1,3);
    if(o.check!==false){s+=T(210,20,o.checkText||'CHECK',6,o.topInk||'#172021',800)+led(210,30,o.led||'#d73535',2.8);}
    const k=(o.knobs||[]);
    k.forEach(a=>{s+=knob(a[0],a[1],a[2]||7,a[3]||'#d7d9d1',a[4]===undefined?-35:a[4]);if(a[5])s+=T(a[0],a[1]+12,a[5],4.7,o.topInk||'#1c2324',700);});
    (o.labels||[]).forEach(a=>s+=T(a[0],a[1],a[2],a[3]||5,o.topInk||'#1c2324',700));
    if(o.midText)s+=T(210,o.midY||143,o.midText,o.midSize||12,o.midInk||'#111819',o.midWeight||700);
    if(o.midScript)s+=S(210,o.midY||143,o.midScript,o.midSize||16,o.midInk||'#f1e9db');
    if(o.extra)s+=o.extra;
    if(o.pad!==false){s+=R(153,160,114,68,o.padColor||'#1e2528',o.padStroke||'#090c0e',1.4,5);s+=bossLogo(210,o.logoY||215,o.logoColor||'#101519',o.logoSize||16);}
    if(o.foot!==false)s+=foot(210,o.footY||236,o.footR||7);
    if(o.sideJacks!==false){s+=jack(141,62,3.5)+jack(279,62,3.5);}
    return s;
  };
  let svgSerial=0;
  const wrap=(s,label)=>{
    const id='pedal-art-'+(++svgSerial);
    s=s.replaceAll('url(#pa-metal)','url(#'+id+'-metal)')
       .replaceAll('url(#pa-wood)','url(#'+id+'-wood)')
       .replaceAll('url(#pa-gold)','url(#'+id+'-gold)');
    return '<svg class="gear-svg pedal-reference-svg" viewBox="0 0 420 250" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+esc(label)+'"><defs>'+
    '<linearGradient id="'+id+'-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f5ef"/><stop offset=".42" stop-color="#9ca5a2"/><stop offset=".68" stop-color="#e3e6df"/><stop offset="1" stop-color="#525c5c"/></linearGradient>'+
    '<linearGradient id="'+id+'-silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9ece7"/><stop offset=".5" stop-color="#bac2bd"/><stop offset="1" stop-color="#7b8581"/></linearGradient>'+
    '<linearGradient id="'+id+'-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ebd69b"/><stop offset=".48" stop-color="#bf964d"/><stop offset="1" stop-color="#80562e"/></linearGradient>'+
    '<pattern id="'+id+'-wood" width="24" height="90" patternUnits="userSpaceOnUse"><rect width="24" height="90" fill="#94653e"/><path d="M3 0q-5 24 1 45t-1 45M12 0q6 22 0 44t3 46M21 0q-4 24 1 48t-1 42" stroke="#d9ae72" stroke-opacity=".42" stroke-width="1.5" fill="none"/></pattern>'+
    '</defs>'+s+'</svg>';
  };
  const standard=(model,o)=>wrap(boss(o),model+' · locally drawn vector reference');
  const key=blockId=>blockId;
  function draw(model,block){
    switch(key(block)+'|'+model){
      /* NOISE GATE — BOSS NF-1 */
      case 'GATE|Noise Gate':{
        let s=R(151,3,118,244,'#b8c6bc','#68756e',2.2,7)+R(155,7,110,80,'#c9d5ca','#e4e9e0',1,3)+R(155,91,110,146,'#aebdb3','#dfe5dc',1,3);
        s+=T(210,20,'CHECK',10,'#111718',900)+C(210,34,7,'#be272d','#8a3034',1.2)+C(208,32,2,'#f48d8e','none',0);
        s+=C(177,24,3.4,'#080b0c','#4e5c56',.8)+C(243,24,3.4,'#080b0c','#4e5c56',.8);
        s+=knob(177,53,19,'#d9dedb',-42)+knob(243,53,19,'#d9dedb',-42);
        [[177,30],[155,53],[199,79],[243,30],[221,79],[265,53]].forEach(p=>s+=C(p[0],p[1],2.5,'#090d0f','none',0));
        s+=T(177,88,'SENS',14,'#090d0e',800)+T(243,88,'DECAY',14,'#090d0e',800);
        s+=R(146,89,128,8,'#9eaca3','#d8ded6',1,2)+P('M149 93H271','#e9eee5',1);
        s+=T(172,116,'← OUTPUT',14,'#080d0f',900)+T(248,116,'INPUT →',14,'#080d0f',900);
        s+=T(210,158,'Noise Gate',25,'#101718',600,'middle','font-family="Arial Rounded MT Bold,Arial,sans-serif" letter-spacing="-1.1"');
        s+=T(250,176,'NF-1',18,'#101718',500);
        s+=R(155,185,110,51,'#101a27','#4c555e',1.7,5)+R(160,190,100,41,'#141e2b','#293746',.7,3);
        s+=T(210,219,'BOSS',27,'#080e19',900,'middle','letter-spacing="2" stroke="#27354a" stroke-width="1.1"');
        s+=jack(145,107,3.7)+jack(275,107,3.7)+R(198,238,24,7,'#101516','#090d0e',.5,2);
        return wrap(s,'BOSS Noise Gate NF-1 reference · metal silver case, twin oversized Sens/Decay knobs, check LED, I/O arrows and embossed Boss rubber pad');
      }
 
      /* EXPRESSION / WAH PEDALS */
      case 'WAH|Wah Pedal':
      case 'VOL|Volume':{
        // Generic expression treadle based on the uploaded top-down wah/volume pedal reference.
        let s=P('M168 5Q210 -2 252 5L282 27 300 216Q302 239 278 244H142Q118 239 120 216L138 27Z','#50575a',3,'#191d20');
        s+=P('M177 15Q210 9 243 15L266 35 280 212Q282 226 267 231H153Q138 226 140 212L154 35Z','#707879',2,'#292f32');
        s+=P('M185 24Q210 18 235 24L252 43 262 207Q263 216 253 220H167Q157 216 158 207L168 43Z','#111619',1.7,'#101416');
        for(let i=0;i<19;i++){const y=48+i*8.1;s+=P('M171 '+y+'L249 '+y,'#465054',1.8)+P('M176 '+(y+2.8)+'L244 '+(y+2.8),'#080b0d',1);}
        s+=P('M154 34L266 34M159 221L261 221','#858d8c',1.2);
        [[146,44],[274,44],[140,214],[280,214]].forEach(p=>s+=screw(p[0],p[1]));
        s+=R(190,5,40,8,'#0b0e10','#626b6a',.8,3)+R(185,237,50,8,'#0b0e10','#626b6a',.8,3);
        s+=C(134,118,5,'#0b0e10','#9da5a2',1)+C(286,118,5,'#0b0e10','#9da5a2',1);
        s+=P('M132 102v32M288 102v32','#7b8585',2.4);
        return wrap(s,'Expression wah/volume pedal reference · black tapered chassis with long ribbed treadle, raised side rails and metal hinge details');
      }
      case 'WAH|Octave-Shift':{
        // DigiTech Whammy reference: wide red housing, black treadle on the left and pitch selector panel on the right.
        let s=R(35,16,350,220,'#b71922','#681016',3.2,8)+R(42,22,336,208,'#e12a31','#ff7774',1.2,5);
        s+=R(51,28,191,198,'#171a1d','#090c0e',2.2,7)+R(62,38,171,172,'#202428','#485052',1.1,3);
        s+=R(84,52,126,143,'#bf1f29','#e65c5f',2,5)+R(94,61,106,125,'#a81722','#f07c77',1.2,3);
        s+=T(147,125,'DIGITECH',22,'#f5f1e9',900,'middle','letter-spacing="1.1" transform="rotate(-90 147 125)"');
        s+=R(251,31,111,146,'#161a1c','#080b0c',1.8,5);
        s+=T(306,46,'HARMONY',8,'#f0e8dc',900)+T(306,58,'WHAMMY',8,'#f0e8dc',900);
        const left=['OCT 2 UP','OCT 1 UP','5TH UP','4TH UP','3RD UP','2ND UP','OCT 1 DOWN','OCT 2 DOWN'];
        const right=['2 OCT UP','1 OCT UP','5TH UP','4TH UP','3RD UP','2ND UP','1 OCT DOWN','DIVE BOMB'];
        for(let i=0;i<8;i++){
          const y=70+i*11;
          s+=R(260,y,42,8,'#7d151d','#cf454b',.7,3)+C(268,y+4,2.5,'#e44b4d','#4b1115',.5)+T(285,y+5.5,left[i],4.1,'#f6e8df',800);
          s+=R(310,y,44,8,'#7d151d','#cf454b',.7,3)+C(318,y+4,2.5,'#e44b4d','#4b1115',.5)+T(337,y+5.5,right[i],4.1,'#f6e8df',800);
        }
        s+=R(285,165,42,10,'#d5d1c7','#494d4d',.8,2)+T(306,172,'DETUNE',5.2,'#b6252d',900);
        s+=R(280,181,54,24,'#292d30','#111416',1,3)+T(307,197,'WHAMMY',11,'#f0e9e0',900,'middle','font-style="italic"');
        s+=C(306,213,4.3,'#191c1d','#aeb5b2',1)+C(306,213,2,'#e3453e','#742024',.5);
        s+=metalSwitch(306,228,8)+T(306,244,'ON',5.5,'#f5e9de',800);
        s+=screw(47,31)+screw(373,31)+screw(47,221)+screw(373,221);
        return wrap(s,'DigiTech Whammy octave shift reference · wide red body, oversized black expression treadle on the left, right-side harmony selector and bypass footswitch');
      }


      case 'MOD|CE-2':{
        // BOSS CE-2 Chorus: sky-blue compact chassis, twin silver-centred knobs and embossed black pedal pad.
        let s=R(143,3,134,244,'#5c9bb5','#3f6878',2.5,11)+R(148,8,124,234,'#83c7e1','#b9e8f4',1.1,9);
        s+=R(154,14,112,219,'none','#e2f3f7',.7,7,'opacity=".48"');
        s+=T(210,24,'CHECK',8,'#1e323d',800)+led(210,38,'#bd2e35',3.5);
        s+=knob(178,76,20,'#e3e6e4',-42)+knob(242,76,20,'#e3e6e4',-42);
        s+=C(178,43,2.7,'#111a1d','none',0)+C(242,43,2.7,'#111a1d','none',0);
        s+=T(178,112,'RATE',11,'#163344',900)+T(242,112,'DEPTH',11,'#163344',900);
        s+=P('M150 132H270','#a7dcea',1.7);
        s+=T(178,151,'← OUTPUT',9,'#173344',900,'middle')+T(242,151,'INPUT →',9,'#173344',900,'middle');
        s+=T(210,183,'Chorus',25,'#101b21',500,'middle','font-family="Arial,sans-serif" letter-spacing="-1.4"');
        s+=T(250,199,'CE-2',13,'#152a35',700,'middle');
        s+=R(153,205,114,31,'#15191b','#070a0b',1.5,4)+bossLogo(210,225,'#090d0e',13);
        s+=foot(210,240,6)+jack(141,113,3.5)+jack(279,113,3.5);
        return wrap(s,'BOSS CE-2 Chorus reference · sky-blue compact pedal, twin silver-centred Rate/Depth knobs, CHECK LED, side input/output and lower black BOSS pad');
      }
      case 'MOD|Detune':{
        // DigiTech Luxe anti-chorus / detune reference: white enclosure with gold ornamental linework and two silver controls.
        let s=R(143,3,134,244,'#e9e8e1','#aaa69a',2.2,5)+R(149,9,122,232,'#f8f7ef','#d3cbb8',1,3);
        for(let i=0;i<9;i++){
          const x=154+i*13.5;
          s+=P('M'+x+' 18q-14 28 4 47t-3 49q-8 25 5 53','#bca56d',.85,'none','opacity=".78"');
          s+=P('M'+(x+4)+' 18q13 28 -4 47t3 49q8 25 -5 53','#c8b47f',.75,'none','opacity=".62"');
        }
        s+=T(210,28,'DIGITECH',14,'#22252a',900,'middle','letter-spacing="-1.1"');
        s+=knob(177,78,24,'#cfd2d2',-40)+knob(243,78,24,'#cfd2d2',-40);
        s+=T(177,119,'Level',11,'#272a2d',600,'middle','font-family="Georgia,serif" font-style="italic"');
        s+=T(243,119,'Detune',11,'#272a2d',600,'middle','font-family="Georgia,serif" font-style="italic"');
        s+=T(177,134,'⊖',16,'#282a2d',800)+T(243,134,'⊕',16,'#282a2d',800);
        s+=T(210,181,'Luxe',43,'#171b20',900,'middle','font-family="Georgia,serif" font-style="italic"');
        s+=T(210,196,'anti-chorus',13,'#282b2f',600,'middle','font-family="Georgia,serif" font-style="italic"');
        s+=led(210,211,'#c52f31',3.5)+foot(210,231,8);
        s+=screw(157,17)+screw(263,17)+screw(157,229)+screw(263,229);
        s+=jack(141,126,3.5)+jack(279,126,3.5);
        return wrap(s,'DigiTech Luxe anti-chorus reference for NUX Detune · white pedal with gold ornamental scrollwork, silver Level/Detune knobs, red LED and chrome footswitch');
      }

      /* COMPRESSORS */
      case 'CMP|Rose Comp':{
        // Ross Compressor: compact lavender enclosure, two large controls, ROSS wordmark and one metal footswitch.
        let s=R(143,3,134,244,'#8f909f','#535663',2.2,10)+R(148,8,124,234,'#b9b9c9','#e0e1e8',1,8);
        s+=R(153,13,114,224,'none','#f1f1f4',.55,6,'opacity=".35"');
        s+=R(169,1,10,9,'#aeb3b6','#60666b',1,2)+R(241,1,10,9,'#aeb3b6','#60666b',1,2);
        s+=T(177,27,'OUT',6,'#292b35',700)+T(243,27,'IN',6,'#292b35',700);
        s+=led(210,36,'#c94748',2.4);
        s+=knob(177,67,18,'#15191d',-38)+knob(243,67,18,'#15191d',-38);
        s+=T(177,101,'LEVEL',7,'#292b35',700)+T(243,101,'SUSTAIN',7,'#292b35',700);
        s+=T(210,153,'ROSS',35,'#34313b',400,'middle','font-family="Georgia,serif" letter-spacing="-2"');
        s+=foot(210,188,9)+T(210,226,'COMPRESSOR',12,'#30323b',800,'middle','letter-spacing="1.2"');
        s+=jack(141,102,3.5)+jack(279,102,3.5);
        return wrap(s,'Ross Compressor reference · lavender enclosure, two black Level/Sustain knobs, centered ROSS wordmark and metal footswitch; without a generic lower rubber pad');
      }
      case 'CMP|K Comp':{
        let s=vcase('#b9bab7','#69716e')+R(151,10,118,226,'#d0d1ce','#eff0ea',1,5);
        s+=T(177,25,'sustain',6,'#323535',500,'middle','font-style="italic"')+T(243,25,'level',6,'#323535',500,'middle','font-style="italic"');
        s+=knob(177,57,16,'#171a1d',-40)+knob(243,57,16,'#171a1d',-40)+T(210,93,'◇',20,'#343b3a',500);
        s+=knob(177,112,15,'#171a1d',-40)+knob(243,112,15,'#171a1d',-40);
        s+=T(177,136,'attack',6,'#303638',500,'middle','font-style="italic"')+T(243,136,'clipping',6,'#303638',500,'middle','font-style="italic"');
        s+=S(210,159,'Compressor',17,'#171c1e')+foot(210,191,11);
        s+=T(210,227,'Keeley',22,'#171c1e',500,'middle','font-family="Georgia,serif"');
        s+=jack(143,64,3.5)+jack(277,64,3.5);
        return wrap(s,'Keeley four-knob compressor reference · silver enclosure with 2 by 2 control layout');
      }
      case 'CMP|Studio Comp':{
        // UAFX 1176: the model number belongs in the lower blue nameplate, not above the controls.
        let s=vcase('#aeb3b1','#59615f')+R(151,10,118,225,'#c6cbc7','#eef0eb',1,5);
        s+=led(210,42,'#8bcf83',3.2);
        s+=knob(177,66,14,'#202629',-38)+knob(243,66,14,'#202629',-38);
        s+=T(177,91,'INPUT',6,'#263133',700)+T(243,91,'OUTPUT',6,'#263133',700);
        s+=metalSwitch(210,103,4.2)+T(210,117,'SINGLE  DUAL  SUSTAIN',5.2,'#263133',700);
        s+=knob(165,137,12,'#202629',-38)+knob(210,137,12,'#202629',-38)+knob(255,137,12,'#202629',-38);
        s+=T(165,157,'ATTACK',5,'#263133',700)+T(210,157,'RELEASE',5,'#263133',700)+T(255,157,'RATIO',5,'#263133',700);
        s+=R(158,164,104,27,'#2b526d','#6c8998',1,1)+T(210,185,'1176',22,'#d7e6e5',900,'middle','letter-spacing="2"');
        s+=foot(210,211,9)+T(210,235,'UAFX STUDIO COMPRESSOR',6.5,'#34403f',900,'middle','letter-spacing=".8"');
        s+=jack(143,55,3.5)+jack(277,55,3.5);
        return wrap(s,'Universal Audio UAFX 1176 compressor reference · silver five-control FET pedal with centered 1176 lettering in the lower blue nameplate');
      }
      /* EQUALIZERS */
      case 'EQ|6-Band EQ':{
        let s=boss({body:'#c8cdca',edge:'#78817e',top:'#eceee8',topH:106,check:false,padColor:'#22292b',knobs:[],sideJacks:true});
        s=R(146,3,128,244,'#c5c9c6','#747c79',2,8)+R(151,9,118,105,'#e0e3df','#a0a7a2',1,4);
        s+=T(210,22,'EQUALIZER',8,'#23292a',900)+T(210,33,'LEVEL',5,'#252b2b',700);
        for(let n=0;n<7;n++){const x=160+n*16.5;s+=P('M'+x+' 39v54','#293133',2)+P('M'+(x-4)+' 47h8M'+(x-4)+' 58h8M'+(x-4)+' 69h8M'+(x-4)+' 80h8M'+(x-4)+' 91h8','#586260',.7)+R(x-4,54+(n%3)*7,8,11,'#f0f1eb','#7f8984',.8,2);}
        s+=T(210,129,'OUTPUT ←     → INPUT',6,'#272d2d',800)+T(210,154,'Equalizer',16,'#232b2d',500,'middle','font-style="italic"')+T(247,165,'GE-7',9,'#232b2d',800);
        s+=R(153,177,114,53,'#171d20','#050809',1.4,4)+T(210,214,'BOSS',19,'#0b1114',900,'middle','letter-spacing="2"');
        s+=jack(142,53,3.8)+jack(278,53,3.8)+foot(210,237,6);
        return wrap(s,'BOSS GE-7 seven-band equalizer reference · seven vertical sliders and bottom BOSS footpad');
      }
      case 'EQ|Align EQ':{
        let s=R(145,3,130,244,'url(#pa-wood)','#4e3422',2,7)+R(150,9,120,232,'url(#pa-wood)','#dfb47c',.8,4);
        s+=T(210,21,'VOLUME',6,'#f5e6c9',700)+T(210,37,'NOTCH',6,'#f5e6c9',700);
        s+=ivory(178,53,15,-35)+ivory(242,53,15,-35);
        for(let i=0;i<6;i++){let x=160+i*20;s+=knob(x,101,5,'#171b1b',-35)+T(x,115,['85','350','700','1.6k','4.8k','10k'][i],4.5,'#f0e1c7',700);}
        s+=T(171,137,'HPF',6,'#f2dfc0')+R(166,143,9,26,'#121818','#d3c19d',.8,2)+R(168,151,5,9,'#757c78','none',0,1);
        s+=T(210,137,'PHASE',6,'#f2dfc0')+C(210,155,6,'#171d1c','#b89e78',1);
        s+=T(248,137,'GAIN',6,'#f2dfc0')+R(244,143,9,26,'#121818','#d3c19d',.8,2)+R(246,157,5,8,'#757c78','none',0,1);
        s+=S(210,184,'LR Baggs',14,'#f5e6c7')+T(210,201,'ALIGN SERIES',6,'#f4e4c6',900)+T(210,213,'EQUALIZER',9,'#f4e4c6',900);
        s+=foot(210,230,8);
        return wrap(s,'LR Baggs Align Series acoustic equalizer reference · wooden enclosure and cream controls');
      }
      case 'EQ|10-Band EQ':{
        let s=R(95,16,230,218,'#171d20','#566265',2.2,9)+R(104,23,212,204,'#222b2e','#6c7777',1,5);
        s+=T(210,41,'10 BAND EQ',13,'#e3e9e3',900,'middle','letter-spacing="1.5"');
        for(let i=0;i<10;i++){const x=121+i*20;s+=P('M'+x+' 63v90','#c0c9c3',1.2)+P('M'+(x-4)+' 70h8M'+(x-4)+' 84h8M'+(x-4)+' 98h8M'+(x-4)+' 112h8M'+(x-4)+' 126h8M'+(x-4)+' 140h8','#67716d',.6)+R(x-4,81+(i%4)*12,8,13,'#bb2529','#252b2d',.9,2);}
        s+=T(125,163,'OUTPUT',5,'#d9e0db',700,'start')+T(294,163,'INPUT',5,'#d9e0db',700,'end');
        s+=T(150,193,'MXR',22,'#e6ece7',900,'middle','letter-spacing="2"')+T(260,193,'EQ',23,'#e6ece7',900,'middle');
        s+=foot(210,219,8)+jack(86,57,3.5)+jack(334,57,3.5);
        return wrap(s,'MXR ten-band graphic EQ reference · black chassis and ten red slider caps');
      }
      case 'EQ|Para EQ':{
        let s=R(47,28,326,190,'#0c1116','#66727a',2,4)+R(55,36,310,174,'#171f29','#46525c',1,2);
        s+=T(67,50,'EQ',8,'#d6e1ea',800,'start')+T(349,50,'PRESET',6,'#a9b7c4',700,'end');
        s+=R(62,59,296,108,'#0a111a','#4b5b69',.9,2);
        for(let i=0;i<5;i++)s+=P('M'+(70+i*70)+' 64v92','#374650',.65)+P('M64 '+(70+i*21)+'h292','#374650',.65);
        s+=P('M72 142 C105 138 115 90 145 94 S185 129 212 115 S252 74 274 92 S315 125 347 77','#48c7d7',2.8);
        [[72,142],[145,94],[212,115],[274,92],[347,77]].forEach(p=>s+=C(p[0],p[1],3,'#45d1e1','#c8eff0',.7));
        s+=T(70,181,'20',5,'#c5d3df',600,'start')+T(350,181,'20k Hz',5,'#c5d3df',600,'end');
        s+=R(64,187,292,19,'#232f3a','#586775',.6,2)+T(210,200,'PARAMETRIC EQ · BAND CONTROL',6,'#e0e7ed',800);
        return wrap(s,'Parametric EQ software reference · dark equalizer interface with cyan frequency response curve');
      }

      case 'RVB|Damp':{
        // Neunaber Wet-style reference supplied for the Damp reverb: dark purple swirl finish and two controls.
        let s=R(143,3,134,244,'#16131f','#555064',2.5,13)+R(148,8,124,234,'#211b33','#77708d',1.2,10);
        for(let i=0;i<7;i++){
          const y=28+i*28;
          s+=P('M153 '+(y+27)+'C177 '+(y-4)+' 238 '+(y-8)+' 267 '+(y+22),'#51428e',2.5,'none','opacity=".62"');
          s+=P('M153 '+(y+8)+'C184 '+(y+38)+' 235 '+(y+42)+' 267 '+(y+4),'#7566bd',1.8,'none','opacity=".48"');
        }
        s+=T(210,26,'9V ⊖',9,'#e8e7ee',800);
        s+=knob(177,69,22,'#17191e',-42)+knob(243,69,22,'#17191e',-42);
        s+=P('M177 44v-4M243 44v-4','#d6d8e3',1.6);
        s+=T(177,113,'mix',12,'#e8e6ed',600,'middle','font-family="Arial,sans-serif"');
        s+=T(243,113,'depth',12,'#e8e6ed',600,'middle','font-family="Arial,sans-serif"');
        s+=C(210,129,8,'#292832','#77717d',1.2)+C(210,129,3,'#a49cae','none',0);
        // White directional arrows removed per latest review.
        s+=T(210,177,'WET',35,'#f1eff3',900,'middle','letter-spacing="1.5"')+T(210,199,'reverb',12,'#e4e0ea',500,'middle','letter-spacing="2"');
        s+=foot(210,218,10);
        s+=jack(141,128,3.5)+jack(279,128,3.5);
        return wrap(s,'Damp reverb reference · dark purple swirl enclosure, Mix and Depth knobs, centre LED, side I/O arrows and single footswitch');
      }

      /* REVERBS */
      case 'RVB|Room':{
        let s=vcase('#4b565a','#303a3d')+R(151,10,118,226,'#343e42','#798589',1,5);
        s+=T(210,23,'M300',9,'#e2e6e1',900,'middle','letter-spacing="1.5"');
        s+=T(210,34,'REVERB',5.3,'#aeb8b7',800);
        s+=T(176,47,'DECAY',5,'#d8dfd9')+T(210,47,'TONE',5,'#d8dfd9')+T(244,47,'BLEND',5,'#d8dfd9');
        s+=knob(176,68,9,'#252a2b',-35)+knob(210,68,9,'#252a2b',-35)+knob(244,68,9,'#252a2b',-35);
        s+=led(210,101,'#cbd843',2.6)+R(159,117,102,29,'#191f22','#86908f',1,3)+T(210,137,'MXR',19,'#e8ebe5',900,'middle','letter-spacing="2"');
        s+=R(160,157,100,48,'#4a5558','#192123',1,3)+foot(210,184,10)+T(210,221,'REVERB',8,'#e6e9e4',800);
        s+=jack(143,57,3.5)+jack(277,57,3.5);
        return wrap(s,'MXR M300 reverb reference · charcoal grey case, top three knobs and footswitch');
      }
      case 'RVB|Hall':{
        let s=R(66,14,288,222,'#b9bdb6','#59615f',2,8)+R(73,21,274,208,'#d5d7d0','#eef0e9',1,5);
        s+=R(83,31,254,61,'#141a1e','#6d7471',1,3)+R(89,37,242,49,'#0a1115','#29343a',.8,1);
        s+=T(98,49,'LEXICON',7,'#d6e1df',900,'start','letter-spacing="1.3"')+T(327,49,'480L',9,'#e6ece6',900,'end');
        s+=T(100,63,'PROGRAM',5,'#e85d65',700,'start')+T(100,74,'RANDOM HALL',7,'#ef676e',800,'start')+T(237,63,'PAGE 1',5,'#e85d65',700);
        s+=P('M240 48h72M240 58h72M240 68h72','#e35d65',.6);
        s+=R(83,101,254,112,'#c5c8c1','#828984',1,3);
        for(let n=0;n<12;n++){const x=93+(n%6)*40,y=110+Math.floor(n/6)*27;s+=R(x,y,32,21,n%3===0?'#7395a5':'#eceee8','#777f7b',.8,2)+T(x+16,y+14,String(n+1).padStart(2,'0'),7,'#252b2c',800);}
        s+=R(92,171,236,26,'#171d21','#7b8581',1,2)+T(210,188,'RTM    SHP    SPR    SIZ    MOD    MIX',6,'#e6e9e1',800);
        for(let n=0;n<6;n++){const x=105+n*39;s+=R(x,204,28,13,'#f0f1e9','#858b85',.6,1);}
        return wrap(s,'Lexicon 480L studio reverb controller reference · LCD program display, soft keys and parameter controls');
      }
      case 'RVB|Plate':{
        let s=vcase('#c7b98f','#88744f')+R(151,10,118,226,'#e5d8b5','#9b855a',1,5);
        s+=T(210,26,'HEAVENLY',11,'#4e857b',900,'middle','letter-spacing="1.4"')+T(210,36,'PLATE REVERB',5.5,'#557b73',800);
        s+=led(210,48,'#ae84c9',2.8);
        s+=knob(177,73,10,'#252a2b',-35)+knob(243,73,10,'#252a2b',-35);
        s+=T(177,91,'DECAY',5,'#3c4943')+T(243,91,'MIX',5,'#3c4943');
        s+=knob(177,119,9,'#252a2b',-35)+knob(210,119,9,'#252a2b',-35)+knob(243,119,9,'#252a2b',-35);
        s+=T(177,136,'PRE',5,'#3c4943')+T(210,136,'EQ',5,'#3c4943')+T(243,136,'MOD',5,'#3c4943');
        s+=T(210,159,'UAFX',15,'#507c75',900,'middle','letter-spacing="1.8"')+T(210,171,'UNIVERSAL AUDIO',5,'#66877e',800);
        s+=foot(210,205,11)+jack(172,3,3.5)+jack(248,3,3.5);
        return wrap(s,'Universal Audio Heavenly Plate Reverb reference · cream enclosure and five cream/black controls');
      }
      case 'RVB|Spring':
        return standard(model,{body:'#8c4035',edge:'#512b27',top:'#a64e40',topH:88,check:true,topInk:'#fff0e7',knobs:[[177,56,9,'#e4d6c5',-35,'MIXER'],[243,56,9,'#e4d6c5',-35,'DWELL'],[210,85,8,'#e4d6c5',-35,'TONE']],midScript:'63 Fender',midY:135,midSize:15,midInk:'#fff0e6',midText:'',padColor:'#383437',padStroke:'#7d7770',logoColor:'#171719',logoY:215,footY:236,footR:7});
      case 'RVB|Shimmer':{
        let s=vcase('#121a21','#505b64')+R(150,10,120,226,'#17212b','#485864',1,5)+R(155,15,110,213,'#111a24','#293847',.8,4);
        for(let n=0;n<75;n++){const a=n*2.399,r=8+(n%12)*5.3,x=210+Math.cos(a)*r,y=126+Math.sin(a)*r;s+=C(x,y,.8+(n%3)*.5,['#ec5ecb','#4ed9f1','#8d78ff','#d9bc5b'][n%4],'none',0,'opacity=".82"');}
        s+=T(210,26,'SERAPHIM',10,'#e7ecea',900,'middle','letter-spacing="1.4"')+T(210,36,'SHIMMER',5.5,'#c7d0d1',700);
        s+=knob(176,64,10,'#171c20',-40)+knob(244,64,10,'#171c20',-40)+knob(210,98,9,'#171c20',-40);
        s+=T(176,80,'MIX',5,'#e5ecea')+T(244,80,'SHIM',5,'#e5ecea')+T(210,113,'DEPTH',5,'#e5ecea');
        s+=T(210,145,'neunaber',13,'#eff2ee',600,'middle','font-style="italic"')+led(210,166,'#9de8f0',3)+foot(210,205,10);
        s+=T(170,189,'BYPASS',4.5,'#e6ecec')+T(250,189,'SHIMMER',4.5,'#e6ecec');
        return wrap(s,'Neunaber Seraphim Shimmer reference · dark enclosure, three knobs and multicolour spiral artwork');
      }

      case 'DLY|Phi Delay':{
        // Keeley Halo Core pedal reference supplied for the Phi Delay artwork: three controls and dual footswitches.
        let s=R(46,3,328,244,'#181a1d','#777a7d',3,18)+R(54,9,312,232,'#222326','#44464b',1.1,14);
        s+=R(63,15,294,220,'none','#55565d',.7,10);
        s+=T(210,29,'TIME',8,'#f0edf0',800,'middle','letter-spacing="1"')+T(210,38,'HPF',6,'#d6d2da',700);
        // Lift the FDBK control and caption clear of the lower Tone knob.
        s+=knob(132,65,29,'#17191c',-30)+knob(286,78,38,'#17191c',-30)+knob(132,153,29,'#17191c',-30);
        s+=T(132,106,'FDBK',8,'#f1eef2',800)+T(132,190,'TONE',6,'#c9c5ce',700);
        s+=T(286,132,'LEVEL',8,'#f1eef2',800)+T(286,142,'SATURATE',6,'#c9c5ce',700);
        s+=C(210,108,9,'#34343a','#777780',1.2)+C(210,108,3,'#a7a7ab','none',0);
        // The white side arrows are intentionally omitted.

        s+=T(247,181,'PHI DELAY',20,'#f4f1f4',900,'middle','letter-spacing="1.1"');
        s+=R(221,203,52,5,'#acafb0','#65666a',.5,2);
        s+=foot(112,218,12)+foot(310,218,12);
        s+=T(112,243,'ON / OFF',6,'#e7e3e9',700)+T(310,243,'TAP / HOLD',6,'#e7e3e9',700);
        s+=T(210,17,'9V ⊖',8,'#ebe8ee',700);
        s+=jack(43,112,3.5)+jack(377,112,3.5);
        return wrap(s,'NUX Phi Delay reference layout · black wide enclosure, three rotary controls, Phi Delay wordmark and twin footswitches');
      }

      /* DELAYS */
      case 'DLY|Analog Delay':
        return standard(model,{body:'#bd4c59',edge:'#852d38',top:'#d66b73',topH:93,check:true,topInk:'#fff4ed',knobs:[[177,54,9,'#f0e2d2',-35,'REPEAT RATE'],[243,54,9,'#f0e2d2',-35,'INTENSITY'],[210,83,8,'#e8dacc',-35,'ECHO']],midText:'Delay',midY:132,midSize:23,midWeight:500,midInk:'#fff4ed',name:'DM-3',padColor:'#343638',logoColor:'#111518',footY:236,extra:T(210,151,'DM-3',7,'#fff0e8',800)});
      case 'DLY|Digital Delay':
        return standard(model,{body:'#d6d8d4',edge:'#737c7a',top:'#e8eae5',topH:104,check:true,knobs:[[165,56,7,'#169bc8',-35,'E.LEVEL'],[195,56,7,'#169bc8',-35,'FEEDBACK'],[225,56,7,'#169bc8',-35,'TIME'],[255,56,7,'#169bc8',-35,'MODE']],midText:'Digital Delay',midY:134,midSize:13,midInk:'#293e50',midWeight:700,name:'DD-8',nameY:149,nameSize:9,nameColor:'#293e50',padColor:'#21282c',logoColor:'#111619',footY:236});
      case 'DLY|Modulation':{
        let s=vcase('#137f91','#0a5261')+R(151,10,118,226,'#1593a3','#5ab4bb',1,5)+R(155,14,110,213,'#114653','#226a72',1,3);
        s+=T(210,28,'MODULATION DELAY II',7,'#e1ece3',900);
        const xs=[174,210,246],ys=[57,103];ys.forEach((y,row)=>xs.forEach((x,col)=>{s+=knob(x,y,8,'#c1d5c7',-30);s+=T(x,y+14,['TIME','REPEAT','LEVEL','DEPTH','MOD','MODE'][row*3+col],4.6,'#e1ede4',700);}));
        s+=R(160,143,100,67,'#1e4e55','#6fb2b4',1,3);
        for(let n=0;n<5;n++)s+=P('M'+(168+n*18)+' 157l9 -7 9 7 -9 7z','#547e7b',.8,'#17363b');
        s+=T(210,185,'IBANEZ',13,'#d4e5db',900,'middle','letter-spacing="1.2"')+T(210,197,'DML10',7,'#d4e5db',800)+foot(210,226,7);
        return wrap(s,'Ibanez DML10 Modulation Delay II reference · cyan blue body, six controls and lower display panel');
      }
      case 'DLY|Tape Echo':{
        let s=R(51,19,318,211,'#202729','#111819',3,8)+R(59,27,302,195,'#343c3c','#7a817b',1,4);
        s+=R(67,36,286,25,'#c8c6b6','#e7e3d2',1,1)+T(82,53,'SPACE ECHO',12,'#1f2929',900,'start')+T(340,53,'ROLAND',9,'#2a3332',900,'end');
        s+=R(67,68,286,139,'#0e1818','#6c7a73',1,2)+R(73,74,274,127,'#1b2824','#3d5149',.8,2);
        s+=R(78,83,44,39,'#111819','#60726c',1,2)+P('M84 107l8 -16 8 11 8 -15 8 20','#d5d6b5',1.2)+T(100,131,'RE-201',6,'#d6dfce',800);
        s+=R(130,81,207,32,'#25322d','#748177',.8,2);
        [151,196,241,286].forEach((x,i)=>{s+=knob(x,96,8,'#d7dbd0',-35)+T(x,122,['MODE','REPEAT','INTENSITY','VOLUME'][i],4.8,'#e1e6d8',700);});
        [145,195,245,295].forEach((x,i)=>{s+=knob(x,155,7,'#d5d9cf',-35);});
        s+=R(75,177,270,18,'#d0d1c7','#67716b',.8,1);
        [85,117,149,181,213,245,277,333].forEach(x=>s+=jack(x,186,3.1));
        return wrap(s,'Roland RE-201 Space Echo reference · wide tape echo deck with transport and repeat controls');
      }
      case 'DLY|Reverse':{
        let s=vcase('#c79e49','#916d33')+R(151,10,118,226,'#d9b45f','#a37b39',1,5);
        s+=T(174,25,'DELAY',6,'#3c2c1e',800)+T(244,25,'REGEN',6,'#3c2c1e',800);
        s+=knob(177,58,13,'#151a1d',-35)+knob(243,58,13,'#151a1d',-35)+knob(177,101,13,'#151a1d',-35)+knob(243,101,13,'#151a1d',-35);
        s+=T(177,79,'MIX',5,'#35291d')+T(243,79,'TIME',5,'#35291d')+T(177,123,'FEEDBACK',4.6,'#35291d')+T(243,123,'MODE',5,'#35291d');
        s+=led(210,144,'#d7c8a4',3)+T(210,166,'Alter Ego',19,'#f3e5c9',500,'middle','font-family="Brush Script MT,Segoe Script,cursive"')+T(210,180,'TC ELECTRONIC',6,'#6d4c2e',900,'middle','letter-spacing="1.2"');
        s+=foot(210,211,9)+jack(143,71,3.5)+jack(277,71,3.5);
        return wrap(s,'TC Electronic Alter Ego delay reference · champagne-gold enclosure and four black knobs');
      }
      case 'DLY|Pan Delay':{
        let s=vcase('#123a83','#082c62')+R(151,10,118,226,'#1559a2','#0c3470',1,5);
        s+=T(210,26,'PAN DELAY',13,'#d1dce4',900,'middle','letter-spacing="1"')+T(210,38,'DPL-10',6,'#e5e9e7',700);
        s+=knob(174,68,10,'#20bc85',-38)+knob(210,68,10,'#20bc85',-38)+knob(246,68,10,'#20bc85',-38);
        s+=T(174,88,'PAN',5,'#e1e9e7')+T(210,88,'TIME',5,'#e1e9e7')+T(246,88,'DELAY',5,'#e1e9e7');
        s+=R(158,103,104,118,'#121a21','#487183',1,2);
        for(let n=0;n<6;n++)s+=P('M166 '+(114+n*15)+'h88','#59666a',.9);
        for(let n=0;n<5;n++)s+=P('M'+(168+n*18)+' '+(118+n%2*8)+'l12 10 -12 10','#53676e',1);
        s+=T(210,236,'Ibanez',10,'#dce7e6',900);
        s+=jack(143,61,3.6)+jack(277,61,3.6);
        return wrap(s,'Ibanez DPL-10 Pan Delay reference · blue enclosure and three green rotary knobs');
      }
      case 'DLY|Duotime':{
        let s=R(119,3,182,244,'#51c6be','#2f827d',2.2,13)+R(127,10,166,230,'#77d5cf','#9de6df',.8,10);
        s+=T(151,26,'LOOP LEVEL',5,'#173e3d',800)+T(210,26,'MODE',5,'#173e3d',800)+T(269,26,'PARAMETER',5,'#173e3d',800);
        s+=knob(151,43,9,'#1b2728',-42)+knob(210,43,9,'#1b2728',-42)+knob(269,43,9,'#1b2728',-42);
        s+=R(186,57,48,21,'#14252b','#73aaa4',1,2)+T(210,71,'DUAL',8,'#78dacf',900);
        [151,191,231,271].forEach((x,i)=>{[94,134].forEach((y,row)=>{s+=knob(x,y,8,'#1c2929',-42)+T(x,y+13,['TIME1','REP1','TIME2','REP2'][i],4.3,'#173d3d',700);});});
        s+=T(210,169,'duotime',13,'#194e4c',900)+T(210,182,'DUAL DELAY ENGINE',5.5,'#205955',800,'middle','letter-spacing="1"');
        s+=led(210,193,'#a7d9b5',3)+foot(169,220,8)+foot(251,220,8)+T(169,238,'LOOP',5,'#163e3b')+T(251,238,'TAP',5,'#163e3b');
        return wrap(s,'NUX Duotime reference · turquoise square pedal, 11 controls and dual footswitches');
      }
      /* MODULATION */
      case 'MOD|CE-1':{
        let s=R(50,21,320,207,'#6b716a','#292f2d',3,7)+R(59,30,302,189,'#c0c3ba','#8a8f87',1,3);
        s+=R(69,39,282,54,'#d9dcd3','#8b938a',1,2)+T(210,54,'BOSS CHORUS ENSEMBLE',12,'#c34b29',900);
        s+=T(84,72,'INPUT',6,'#272c29',700)+jack(84,81,4)+[145,185,225,265,305].map(x=>knob(x,69,7,'#252b2a',-32)).join('');
        s+=T(145,89,'RATE',5,'#252b2a')+T(185,89,'DEPTH',5,'#252b2a')+T(225,89,'CHORUS',5,'#252b2a')+T(265,89,'INTENSITY',5,'#252b2a')+T(305,89,'VOLUME',5,'#252b2a');
        s+=led(93,123,'#d54236',2.7)+led(327,123,'#d54236',2.7);
        s+=R(68,100,284,109,'#8f9790','#6d7772',1,4)+foot(150,166,15)+foot(270,166,15)+T(150,199,'CHORUS',7,'#202727',800)+T(270,199,'VIBRATO',7,'#202727',800)+T(210,224,'BOSS CE-1',8,'#ecefe5',900);
        s+=jack(52,73,4)+jack(368,73,4);
        return wrap(s,'BOSS CE-1 Chorus Ensemble reference · vintage wide unit with dual footswitches');
      }
      case 'MOD|St Chorus':{
        let s=R(67,17,286,218,'#e8ce1c','#a38e20',2,7)+R(74,24,272,204,'#f1da2d','#f5e66b',1,3);
        s+=T(210,46,'STEREO',10,'#14191a',900)+T(210,68,'CHORUS',24,'#111617',900);
        [106,158,210,262,314].forEach((x,i)=>{s+=knob(x,111,12,'#15191a',-35)+T(x,139,['BASS','TREBLE','INTENSITY','WIDTH','RATE'][i],5.5,'#171b1b',800);});
        s+=led(105,164,'#bd3d2f',3)+T(210,180,'EFFECT',6,'#292d25',800);
        s+=T(210,204,'MXR',13,'#171b1c',900,'middle','letter-spacing="1.5"')+foot(210,222,7);
        return wrap(s,'MXR Stereo Chorus reference · wide yellow enclosure, five black controls and centre footswitch');
      }
      case 'MOD|Vibrator':
        return standard(model,{body:'#1798c7',edge:'#0b5276',top:'#1688b4',topH:91,check:false,topInk:'#f1f4f1',knobs:[[177,51,9,'#101719',-35,'RATE'],[243,51,9,'#101719',-35,'DEPTH']],labels:[[210,90,'RISE TIME',5]],midText:'Vibrato',midY:137,midSize:20,midWeight:500,midInk:'#dce7e6',name:'VB-2W',nameY:153,nameSize:9,nameColor:'#dfebe7',padColor:'#172b35',logoColor:'#0b1920',logoY:215,extra:metalSwitch(210,91,4)+led(210,24,'#58d1cb',2.7)});
      case 'MOD|Flanger':
        return standard(model,{body:'#8b3da1',edge:'#512660',top:'#9f50b4',topH:92,check:true,topInk:'#f4e8f4',knobs:[[169,54,7,'#d6d0da',-35,'MANUAL'],[197,54,7,'#d6d0da',-35,'DEPTH'],[225,54,7,'#d6d0da',-35,'RATE'],[253,54,7,'#d6d0da',-35,'RES']],midText:'Flanger',midY:137,midSize:19,midWeight:600,midInk:'#28152e',name:'BF-3',nameY:153,nameSize:9,nameColor:'#f3e5ef',padColor:'#20222a',logoColor:'#111318',logoY:215});
      case 'MOD|Phase 90':{
        let s=vcase('#e87524','#a54e1c')+R(151,10,118,226,'#f18a2c','#c15c1e',1,5);
        s+=T(210,26,'SPEED',8,'#211913',800)+knob(210,79,23,'#101416',-25)+led(210,126,'#b52b24',4);
        s+=T(210,151,'MXR',16,'#181a1a',900,'middle','letter-spacing="1.4"')+T(210,179,'phase 90',14,'#211a15',500,'middle','font-style="italic"')+foot(210,216,9)+jack(143,67,3.5)+jack(277,67,3.5);
        return wrap(s,'MXR Phase 90 reference · orange case, single large black Speed knob');
      }
      case 'MOD|Phase 100':{
        let s=vcase('#ea8525','#a64e18')+R(151,10,118,226,'#f29b32','#b86620',1,5);
        s+=T(177,25,'INTENSITY',6,'#241a13',800)+T(243,25,'SPEED',6,'#241a13',800)+knob(177,63,16,'#121619',-42)+knob(243,63,16,'#121619',-42);
        s+=P('M158 103q9 -18 18 0t18 0t18 0M212 103q9 -18 18 0t18 0t18 0','#362a20',1.3)+led(210,126,'#902c22',3.2);
        s+=R(170,143,80,23,'#f5a43b','#8b4e1e',1,3)+T(210,160,'MXR',16,'#171b1b',900)+T(210,187,'phase 100',13,'#201a15',500,'middle','font-style="italic"')+foot(210,217,9);
        return wrap(s,'MXR Phase 100 reference · orange case with two large Intensity and Speed knobs');
      }
      case 'MOD|SCF':{
        let s=vcase('#161f25','#68777b')+R(151,10,118,226,'#101a20','#57666b',1,5)+R(155,14,110,112,'#0a1116','#647477',.8,3);
        s+=T(210,27,'STEREO CHORUS+',8,'#e5ece9',900)+T(210,39,'PITCH MODULATOR & FLANGER',4.7,'#c8d1cf',700);
        [174,202,230,258].forEach((x,i)=>{s+=knob(x,72,7,'#52c8e2',-35)+T(x,88,['SPEED','WIDTH','MODE','INTENSITY'][i],4.4,'#e1e9e6',700);});
        s+=T(166,111,'OVERLOAD',4.7,'#c5d0cd',700)+led(193,108,'#e34840',2.3)+T(239,111,'INPUT GAIN',4.7,'#c5d0cd',700);
        s+=R(155,135,110,87,'#18232b','#59676b',1,3)+T(210,156,'tc electronic',12,'#e3e9e4',900,'middle','font-style="italic"')+foot(210,194,10)+T(210,216,'SCF',7,'#d2dcda',800);
        return wrap(s,'TC Electronic Stereo Chorus+ reference · black face, four turquoise-capped knobs and footswitch');
      }
      case 'MOD|U-Vibe':{
        let s=R(59,16,302,218,'#b8bec0','#6f7778',2.2,7)+R(66,23,288,204,'#d3d7d7','#818a89',1,4);
        s+=R(72,91,276,112,'#242a30','#cfd4d0',1.6,26);
        [125,210,295].forEach((x,i)=>{s+=T(x,41,['SPEED','VOLUME','INTENSITY'][i],6,'#212a2b',800)+knob(x,66,15,'#252a2e',-35);});
        s+=P('M80 109q-15 0 -8 19l15 56q4 11 18 11h200q14 0 18 -11l15 -56q7 -19 -8 -19','#d2d6d1',1.2,'#293039');
        s+=S(210,151,'Uni-Vibe',28,'#f0f1ea')+T(210,176,'ROTARY SPEAKER EFFECT',6,'#dce1de',800);
        s+=metalSwitch(132,207,8)+metalSwitch(288,207,8)+T(132,232,'CHORUS/VIBRATO',4.5,'#f1f3ed',800)+T(288,232,'EFFECT/BYPASS',4.5,'#f1f3ed',800);
        return wrap(s,'Dunlop Uni-Vibe reference · wide brushed-silver housing with three knobs and two toggle switches');
      }
      case 'MOD|Tremolo':
        return standard(model,{body:'#167e9e',edge:'#10566b',top:'#177f99',topH:91,check:true,topInk:'#edf3ee',knobs:[[177,55,9,'#e0e1d7',-35,'RATE'],[243,55,9,'#e0e1d7',-35,'WAVE'],[210,85,8,'#e0e1d7',-35,'DEPTH']],midText:'Tremolo',midY:137,midSize:17,midInk:'#e1e9e3',midWeight:500,name:'TR-2',nameY:152,nameSize:9,nameColor:'#e6efea',padColor:'#1d292d',logoColor:'#0d171a',logoY:215});
      case 'MOD|Rotary':{
        let s=vcase('#b4bab9','#777e7d')+R(151,10,118,226,'#d3d7d4','#939b98',1,5);
        s+=T(210,27,'tc electronic',9,'#bc333b',900,'middle','font-style="italic"')+T(210,49,'VIBRACLONE',14,'#b9313a',900)+T(210,60,'ROTARY',6,'#a8363d',800);
        s+=T(177,77,'INTENSITY',6,'#202828',700)+T(243,77,'SPEED',6,'#202828',700)+knob(177,104,14,'#202426',-35)+knob(243,104,14,'#202426',-35);
        s+=R(198,132,24,28,'#262e2f','#7c8482',1,3)+R(204,137,12,10,'#111617','#a6aeaa',.5,2)+P('M161 172h98M161 180h98M161 188h98','#a84043',1);
        s+=foot(210,211,10)+T(210,232,'TRUE BYPASS',5,'#a93b40',800);
        return wrap(s,'TC Electronic Vibraclone rotary reference · silver case and red Vibraclone branding');
      }
      case 'MOD|Harmonist':{
        let s=R(122,3,176,244,'#902e35','#552329',2,8)+R(129,10,162,111,'#a83c41','#d07a72',1,4);
        s+=T(210,25,'HARMONYMAN',12,'#f4dfd8',900);
        s+=R(145,34,40,22,'#102025','#538f83',1,2)+T(165,49,'5H',13,'#6df17b',900)+R(192,34,40,22,'#102025','#538f83',1,2)+T(212,49,'3L',13,'#6df17b',900)+led(266,43,'#48e58d',2.7);
        s+=knob(165,83,9,'#17191b',-35)+knob(212,83,9,'#17191b',-35)+knob(257,83,9,'#17191b',-35)+T(165,100,'VOICE 1',5,'#f4e3db')+T(212,100,'VOICE 2',5,'#f4e3db')+T(257,100,'MIX',5,'#f4e3db');
        s+=R(133,128,154,94,'#90343b','#54232a',1,2)+R(138,135,69,81,'#292f32','#111719',1,3)+R(213,135,68,81,'#292f32','#111719',1,3);
        s+=T(172,149,'HARMONY',6,'#f4dfd8',800)+T(247,149,'MEMORY',6,'#f4dfd8',800)+foot(172,181,13)+foot(247,181,13);
        return wrap(s,'DigiTech HarmonyMan reference · red wide housing, two displays and dual footswitches');
      }
      case 'MOD|SCH-1':{
        let s=vcase('#101a20','#303e43')+R(151,10,118,226,'#0e1c22','#465b61',1,5)+R(155,14,110,99,'#090f13','#5b6a6b',.8,2);
        s+=T(165,25,'DIRECT',5,'#e4eeea',700,'start')+T(255,25,'STEREO',5,'#e4eeea',700,'end')+T(210,41,'SCH-1',8,'#dce6e2',800);
        [[177,65],[210,65],[243,65]].forEach((p,i)=>{s+=knob(p[0],p[1],15,'#252a28',-35)+T(p[0],88,['RATE','DEPTH','TONE'][i],5,'#ced9d4',700);});
        s+=R(155,106,110,28,'#1b788a','#63b8bd',1,2)+T(210,124,'STEREO CHORUS',9,'#e9f0ea',900);
        s+=R(155,138,110,83,'#171f22','#4b5b5f',1,3)+R(162,146,96,63,'#242e31','#657072',.8,2);
        s+=foot(210,185,10)+T(210,214,'ARION',11,'#e3eae4',900);
        s+=jack(143,60,3.7)+jack(277,60,3.7);
        return wrap(s,'Arion SCH-1 Stereo Chorus reference · black and teal two-section case with three top knobs');
      }
      case 'MOD|Mono Octave':{
        let s=vcase('#b52e38','#6f2028')+R(151,10,118,226,'#c83c47','#7c2730',1,5);
        s+=T(210,22,'SUB N UP',11,'#f8e7df',900,'middle','letter-spacing="1"')+T(210,34,'OCTAVER',5.5,'#f5e4db',800)+led(210,44,'#e8b7b0',3);
        s+=knob(177,77,11,'#17191b',-35)+knob(243,77,11,'#17191b',-35)+knob(210,119,10,'#17191b',-35);
        s+=T(177,95,'DRY',6,'#f7ebe6')+T(243,95,'UP',6,'#f7ebe6')+T(210,137,'SUB',6,'#f7ebe6');
        s+=T(210,163,'tc electronic',9,'#f8e9e2',800,'middle','font-style="italic"')+T(210,178,'SUB N UP',7,'#f5e4dc',900,'middle','letter-spacing="1"')+foot(210,211,10)+jack(143,64,3.5)+jack(277,64,3.5);
        return wrap(s,'TC Electronic Sub N Up octave pedal reference · red case, three knobs, LED and footswitch');
      }
      /* OVERDRIVES, DISTORTIONS, FUZZ AND BOOSTS */
      case 'EFX|Distortion+':{
        let s=vcase('#d8b52e','#987c24')+R(151,10,118,226,'#eacb3b','#b99a2c',1,5);
        s+=T(210,26,'OUTPUT',6,'#28251b',800)+T(210,37,'DISTORTION',6,'#28251b',800)+knob(177,66,14,'#14191b',-35)+knob(243,66,14,'#14191b',-35);
        s+=R(177,107,66,22,'#edcf3b','#8d7725',1,2)+T(210,122,'MXR',18,'#111718',900,'middle','letter-spacing="1.6"')+T(210,155,'distortion +',12,'#211e18',500,'middle','font-style="italic"');
        s+=foot(210,211,11)+jack(143,60,3.5)+jack(277,60,3.5);
        return wrap(s,'MXR Distortion Plus reference · yellow enclosure with two black controls');
      }
      case 'EFX|RC Boost':
      case 'EFX|AC Boost':{
        const isAC=model==='AC Boost',body=isAC?'#d7b63d':'#e2e1d7',accent=isAC?'#ffd977':'#a9b8a9';
        let s=vcase(body,'#817a56')+R(151,10,118,226,body,'#f6e4a6',1,5);
        s+=T(210,25,isAC?'AC BOOSTER':'RC BOOSTER',9,isAC?'#3b3020':'#262b2a',900,'middle','letter-spacing=".8"');
        const xs=isAC?[177,243]:[169,210,251];xs.forEach((x,i)=>{s+=knob(x,67,isAC?11:9,'#161a1c',-35)+T(x,85,(isAC?['GAIN','VOLUME']:['GAIN','VOLUME','TONE'])[i],5,'#363c37',700);});
        s+=led(210,111,'#cf4a31',3)+T(210,143,'XOTIC',17,'#202728',900,'middle','letter-spacing="1.6"')+T(210,159,'EFFECTS',5,'#4d5147',700);
        s+=foot(210,209,10)+jack(143,60,3.5)+jack(277,60,3.5);
        return wrap(s,isAC?'Xotic AC Booster reference · mustard yellow enclosure and three black knobs':'Xotic RC Booster reference · ivory enclosure with gain, volume and tone controls');
      }
      case 'EFX|Dist One':
        return standard(model,{body:'#dc532b',edge:'#9d3824',top:'#e9663d',topH:94,check:true,topInk:'#fff0e8',knobs:[[177,55,9,'#ece6d7',-35,'TONE'],[243,55,9,'#ece6d7',-35,'DIST'],[210,85,8,'#e5ded1',-35,'LEVEL']],midText:'Distortion',midY:139,midSize:14,midInk:'#fff0e6',midWeight:700,name:'DS-1',nameY:153,nameSize:9,nameColor:'#fff0e6',padColor:'#23282a',logoColor:'#11171a',logoY:215});
      case 'EFX|T Scream':{
        let s=vcase('#157944','#0c4c2c')+R(151,10,118,226,'#168a4d','#0f582f',1,5);
        s+=led(210,23,'#d93f34',3)+knob(177,57,12,'#161a1c',-35)+knob(243,57,12,'#161a1c',-35)+knob(210,94,10,'#161a1c',-35);
        s+=T(177,77,'OVERDRIVE',4.8,'#e7eee4')+T(243,77,'TONE',5,'#e7eee4')+T(210,114,'LEVEL',5,'#e7eee4');
        s+=R(159,129,102,22,'#e7e7db','#9aa19a',.8,2)+T(210,144,'TUBE SCREAMER',8,'#26352a',900)+T(210,160,'TS808',7,'#dce8da',800);
        s+=R(153,174,114,54,'#111a18','#0a0e0d',1,3)+T(210,213,'IBANEZ',16,'#111715',900,'middle','letter-spacing="1.8"')+foot(210,236,6);
        s+=jack(143,64,3.5)+jack(277,64,3.5);
        return wrap(s,'Ibanez TS808 Tube Screamer reference · green case, three black knobs and rectangular logo panel');
      }
      case 'EFX|Blues Drv':
        return standard(model,{body:'#286da6',edge:'#154c79',top:'#317db8',topH:94,check:true,topInk:'#edf6f7',knobs:[[177,55,9,'#171b1e',-35,'LEVEL'],[243,55,9,'#171b1e',-35,'TONE'],[210,85,8,'#171b1e',-35,'GAIN']],midText:'Blues',midY:137,midSize:15,midInk:'#f0e8c8',midWeight:500,name:'Driver · BD-2',nameY:152,nameSize:8,nameColor:'#dce7e8',padColor:'#1a2228',logoColor:'#101719',logoY:215});
      case 'EFX|Morning Drv':{
        let s=vcase('#bba57a','#8d795d')+R(151,10,118,226,'#c9b687','#e3d1a6',1,5);
        s+=knob(177,59,13,'#f5f0e7',-35)+knob(243,59,13,'#f5f0e7',-35)+knob(243,105,13,'#f5f0e7',-35);
        s+=T(177,79,'VOL',6,'#25251f',800)+T(243,79,'DRIVE',6,'#25251f',800)+T(243,126,'TONE',6,'#25251f',800);
        s+=metalSwitch(177,106,5)+T(177,126,'MODE',5,'#25251f',800);
        s+=P('M173 153q18 -21 37 0q18 -22 37 0M183 158q27 -30 54 0','#493d2c',1)+T(210,182,'★ ★ ★',11,'#433827',900)+T(210,204,'MORNING DRIVE',8,'#3b3328',900,'middle','letter-spacing=".8"');
        s+=foot(210,230,9)+led(251,217,'#3188e8',3.5);
        return wrap(s,'Morning Drive overdrive reference · textured champagne-gold enclosure, three cream knobs, mode toggle and blue LED');
      }
      case 'EFX|Eat Dist':{
        let s=vcase('#24292c','#111618')+R(151,10,118,226,'#30363a','#111619',1,5);
        s+=T(210,28,'DISTORTION',7,'#f0f1e9',900);
        [174,210,246].forEach((x,i)=>{s+=knob(x,66,12,'#1a1d1f',-35)+T(x,88,['DISTORTION','FILTER','VOLUME'][i],5,'#e6ebe4',800);});
        s+=R(160,107,100,38,'#0a0d0f','#8a8f8d',1,2)+T(210,133,'RAT',29,'#e7eae6',900,'middle','letter-spacing="2"');
        s+=foot(210,208,11)+jack(143,51,3.5)+jack(277,51,3.5);
        return wrap(s,'Pro Co RAT distortion reference · matte black box, three large white-lined controls and RAT badge');
      }
      case 'EFX|Red Dirt':{
        // Keeley Red Dirt Pro GE808: glitter-red portrait chassis, triangular cream controls and its own lower label/footswitch layout.
        let s=R(143,3,134,244,'#5e0d19','#32101a',2.4,13)+R(148,7,124,236,'#9b1022','#e65d61',1.2,11);
        s+=R(153,12,114,226,'none','#f5dfcf',1.6,9);
        for(let i=0;i<54;i++){const x=157+((i*37)%106),y=17+((i*53)%214);s+=C(x,y,.55,i%3===0?'#ffd0b7':'#e95a60','none',0,'opacity=".42"');}
        s+=led(210,35,'#2998df',3.6);
        s+=P('M239 17l16 -5 16 5v13l-16 11 -16 -11z','#fff0dc',1.2,'#982235')+T(255,27,'GERMANIUM',4.6,'#fff0dc',800)+T(255,34,'EQUIPPED',3.7,'#fff0dc',700);
        s+=knob(210,64,16,'#f0e7d5',-38)+knob(177,99,16,'#f0e7d5',-38)+knob(243,99,16,'#f0e7d5',-38);
        s+=T(177,76,'OVERDRIVE',6.5,'#fff0df',800)+T(243,76,'LEVEL',6.5,'#fff0df',800)+T(210,126,'TONE',7,'#fff0df',800);
        s+=P('M157 146V231Q157 239 165 239H255Q263 239 263 231V146','#fff0df',1.7);
        s+=T(210,165,'RED DIRT',23,'#fff0df',900,'middle','letter-spacing=".5"')+T(210,179,'Overdrive Pro GE808',7.3,'#fff0df',700);
        s+=T(151,181,'OUTPUT',5.4,'#fff0df',800,'middle','transform="rotate(-90 151 181)"')+T(269,181,'INPUT',5.4,'#fff0df',800,'middle','transform="rotate(-90 269 181)"');
        s+=foot(210,207,11)+S(210,237,'keeley',15,'#fff0df');
        s+=jack(141,121,3.7)+jack(279,121,3.7);
        return wrap(s,'Keeley Red Dirt Pro GE808 reference · glitter-red case, top-centre Tone plus left/right Overdrive and Level knobs, blue LED, large RED DIRT lettering and one chrome footswitch; matching the source enclosure');
      }
      case 'EFX|Crunch':{
        let s=vcase('#9e272b','#591e22')+R(151,10,118,226,'#bd3436','#742328',1,5);
        s+=knob(177,56,15,'#eee6d3',-35)+knob(243,56,15,'#eee6d3',-35)+knob(210,95,15,'#eee6d3',-35);
        s+=T(177,78,'VOL',8,'#f0e5d8',600,'middle','font-family="Georgia,serif"')+T(243,78,'GAIN',8,'#f0e5d8',600,'middle','font-family="Georgia,serif"')+T(210,118,'TONE',8,'#f0e5d8',600,'middle','font-family="Georgia,serif"');
        s+=led(210,133,'#d34535',3)+T(210,157,'CRUNCH BOX',15,'#f4e9db',900,'middle','font-family="Georgia,serif"')+T(210,175,'DISTORTION',8,'#f4e9db',800,'middle','letter-spacing="1"');
        s+=foot(210,213,11)+T(164,185,'OUT',5,'#eee4d5',700)+T(256,185,'IN',5,'#eee4d5',700);
        return wrap(s,'MI Audio Crunch Box reference · red pedal with three white knobs and white lettering');
      }
      case 'EFX|Muff Fuzz':{
        // Electro-Harmonix Big Muff Pi: wider enclosure, one row of three controls and a large lower black panel.
        let s=R(116,5,188,240,'#c8c7bd','#777970',2.2,5)+R(122,10,176,230,'#e6e4d9','#a9a99f',1,3);
        s+=R(130,17,160,68,'#ecebe2','#262a27',1.2,4);
        s+=T(145,30,'AMPLIFIER',5.7,'#242725',800,'start')+T(274,30,'INPUT',5.7,'#242725',800,'end');
        s+=knob(157,57,12,'#171b1d',-38)+knob(210,57,12,'#171b1d',-38)+knob(263,57,12,'#171b1d',-38);
        s+=T(157,81,'VOLUME',6.1,'#242725',800)+T(210,81,'TONE',6.1,'#242725',800)+T(263,81,'SUSTAIN',6.1,'#242725',800);
        s+=led(188,82,'#a52b2b',2.5);
        s+=T(210,120,'BIG MUFF',28,'#b92f31',900,'middle','font-family="Georgia,serif" letter-spacing="-1"');
        s+=P('M133 128H287','#ba3031',2.2)+P('M210 128C210 128 184 139 185 145C187 153 200 159 210 164C220 159 233 153 235 145C236 139 210 128 210 128Z','#ba3031',1,'#ba3031');
        s+=R(132,149,156,69,'#111517','#343a39',1.2,4)+foot(210,185,9);
        s+=screw(137,99)+screw(283,99)+screw(137,207)+screw(283,207);
        s+=T(210,235,'electro-harmonix',11,'#272724',500,'middle','font-family="Georgia,serif" font-style="italic"');
        return wrap(s,'Electro-Harmonix Big Muff Pi reference · wide ivory enclosure, three upper Volume/Tone/Sustain controls, red BIG MUFF lettering and broad black lower panel');
      }
      case 'EFX|Katana':{
        let s=vcase('#d5d8d8','#8b9292')+R(151,10,118,226,'#f0f1ed','#d0d3ce',1,5);
        s+=T(210,28,'KATANA',14,'#27313a',900,'middle','letter-spacing="1"')+T(210,40,'CLEAN BOOST',6,'#525c62',800);
        s+=knob(177,72,12,'#171c20',-35)+knob(243,72,12,'#171c20',-35)+T(177,91,'VOLUME',5,'#2d3538')+T(243,91,'HP',5,'#2d3538');
        s+=T(210,122,'Keeley',16,'#343a3d',500,'middle','font-family="Georgia,serif"')+T(210,139,'ELECTRONICS',5,'#525b5f',800);
        s+=foot(210,207,11)+jack(143,54,3.5)+jack(277,54,3.5);
        return wrap(s,'Keeley Katana Clean Boost reference · white case with two black controls and blue grey wordmark');
      }
      case 'EFX|ST Singer':{
        let s=vcase('#c1c8c4','#727d77')+R(151,10,118,226,'#d7ddda','#9aa59e',1,5);
        s+=T(210,24,'NUX',8,'#26372f',900,'middle','letter-spacing="2"')+knob(177,58,10,'#202629',-35)+knob(243,58,10,'#202629',-35)+knob(210,99,10,'#202629',-35);
        s+=T(177,77,'VOLUME',5,'#26312c')+T(243,77,'TONE',5,'#26312c')+T(210,118,'DRIVE',5,'#26312c');
        s+=T(210,147,'STEEL',14,'#202d29',900,'middle','letter-spacing=".8"')+T(210,163,'SINGER',14,'#202d29',900,'middle','letter-spacing=".8"');
        s+=T(210,177,'OVERDRIVE',5,'#4d5b54',800)+foot(210,211,10)+T(210,236,'NUX',7,'#303a35',800);
        return wrap(s,'NUX Steel Singer Drive reference · silver stompbox with three black controls and stacked Steel Singer lettering');
      }
      case 'EFX|Red Fuzz':{
        let s=C(210,125,112,'#c9262c','#681619',2.5)+C(210,125,104,'#e0373a','#f18b7b',1.2);
        s+=T(210,39,'FUZZ',12,'#fff2e6',900)+T(210,54,'FACE',12,'#fff2e6',900);
        s+=knob(174,78,12,'#111619',-35)+knob(246,78,12,'#111619',-35)+T(174,97,'VOLUME',5,'#fff0e6')+T(246,97,'FUZZ',5,'#fff0e6');
        s+=R(170,113,80,61,'#111719','#353a3b',1,22)+T(210,151,'FUZZ FACE',12,'#e2e3d7',900);
        s+=metalSwitch(210,194,9)+T(210,225,'ARBITER',7,'#fff0e9',800);
        return wrap(s,'Arbiter Fuzz Face reference · circular red enclosure with two top controls and central black switch area');
      }
      case 'EFX|Touch Wah':{
        let s=R(88,18,244,214,'#323a38','#101819',2.4,7)+R(96,26,228,198,'#4a5550','#707b73',1,3);
        s+=T(210,43,'MUSITRONICS',11,'#e3e9da',900,'middle','letter-spacing="1"')+T(210,59,'MU-TRON III',12,'#f0f1e2',900);
        s+=R(108,68,204,84,'#131a19','#8a958a',1,2);
        s+=T(126,84,'UP',5,'#e2e8d9')+T(294,84,'DOWN',5,'#e2e8d9');
        [130,170,210,250,290].forEach((x,i)=>{s+=knob(x,112,10,'#171c1a',-35)+T(x,131,['PEAK','GAIN','DRIVE','TONE','LEVEL'][i],5,'#dfe6d8',700);});
        s+=R(111,159,198,47,'#1d2722','#69786b',1,2);
        s+=T(210,181,'ENVELOPE FILTER',8,'#e3ebdc',900)+T(210,196,'AUTO WAH',6,'#dce6d5',700);
        s+=foot(210,218,8);
        return wrap(s,'Musitronics Mu-Tron III envelope filter reference · wide green enclosure with five controls');
      }
      case 'EFX|Full-OD HP · IMAGE':{
        // Fulltone OCD reference: LED sits between the upper controls; OCD wordmark stays below the Tone knob.
        let s=vcase('#ddd7c9','#8e8777')+R(151,10,118,226,'#ece8dd','#b9ae9a',1,5);
        s+=T(177,28,'VOLUME',6,'#2e3432',600)+T(243,28,'DRIVE',6,'#2e3432',600);
        s+=knob(177,57,15,'#14191a',-35)+knob(243,57,15,'#14191a',-35);
        s+=T(210,27,'HP / LP',4.8,'#2e3432',700)+metalSwitch(210,38,3.5)+led(210,68,'#3b9cdb',3.5);
        s+=knob(210,113,15,'#14191a',-35)+T(233,118,'TONE',6,'#2e3432',700,'start');
        s+=T(210,169,'OCD',37,'#151a1b',900,'middle','font-family="Arial Black,Arial,sans-serif" letter-spacing="-2"');
        s+=foot(210,207,10)+S(210,238,'Fulltone',13,'#1b2120')+T(210,246,'BUILT IN THE USA',4,'#343a37',700);
        s+=jack(143,58,3.5)+jack(277,58,3.5);
        return wrap(s,'Fulltone OCD-style overdrive reference used for NUX Full-OD HP image model · cream case with two upper Volume/Drive knobs, central tone control, blue LED above the OCD wordmark and chrome footswitch');
      }
      case 'EFX|Horseman OD · IMAGE':{
        let s=R(84,29,252,196,'url(#pa-gold)','#8b632d',2.2,9)+R(91,36,238,182,'#dba94f','#f0d68e',.8,5);
        [142,210,278].forEach((x,i)=>{s+=knob(x,72,15,'#351e12',-35)+T(x,97,['GAIN','TREBLE','OUTPUT'][i],6,'#3d2919',700);});
        s+=C(109,119,3,'#8b2c1f','#c78c50',.6)+P('M121 154q23 -23 46 0q23 -23 46 0','#6c4525',1.2);
        s+=P('M117 151q29 -23 59 0q29 -23 59 0','#6c4525',1.2)+T(210,168,'CENTAUR',9,'#4d301b',800);
        s+=P('M110 134q25 -8 48 -7m-24 -10q-5 9 -5 18m5 -18q8 8 12 15','#704721',1.3)+metalSwitch(275,153,8)+T(294,156,'',5);
        s+=T(210,204,'K L O N',6,'#68431f',800,'middle','letter-spacing="2"');
        return wrap(s,'Klon Centaur-style reference for NUX Horseman OD · golden horizontal enclosure and three dark controls');
      }
      case 'EFX|NOB ODR · IMAGE':{
        let s=vcase('#61a92e','#32651c')+R(151,10,118,226,'#79bd3b','#3e7626',1,5);
        s+=R(156,15,108,106,'#101719','#303a39',1,2)+T(210,25,'OUT     REMOTE     9V     IN',5,'#d4e2d0',800);
        [174,210,246].forEach((x,i)=>{s+=knob(x,69,15,'#15191b',-35)+T(x,96,['DRIVE','SPECTRUM','LEVEL'][i],6,'#f0f2e8',800);});
        s+=T(166,111,'ODR-1',5,'#dde7d8',700,'start');
        s+=R(156,125,108,54,'#242c2c','#a2afa2',1,2)+T(210,146,'Nobels',12,'#e7eee5',600,'middle','font-family="Georgia,serif"')+T(210,164,'ODR-1',18,'#f2f4ec',900)+T(210,175,'NATURAL OVERDRIVE',5,'#e1e9dc',700);
        s+=R(156,181,108,48,'#24282a','#101415',1,3)+P('M180 192q22 -15 44 0l-18 27 7 -31 -14 31 -2 -27','#14181a',2)+T(210,239,'',6);
        return wrap(s,'Nobels ODR-1 reference · bright green enclosure, three controls and large black treadle');
      }
      case 'EFX|RIV BLUEFLOG · IMAGE':{
        let s=R(82,17,256,218,'#263c68','#101b30',2.4,8)+R(89,24,242,205,'#36588a','#8aa4ca',1,4);
        s+=T(210,44,'RIVERA',20,'#d9e7ef',800,'middle','letter-spacing="2"');
        [142,210,278].forEach((x,i)=>{s+=knob(x,76,13,'#101a20',-35)+T(x,99,['LEVEL','GAIN','TONE'][i],6,'#f0f3ed',800);});
        s+=led(210,117,'#d94c47',3.2)+R(95,130,230,48,'#283f69','#98b1c9',1,4);
        s+=T(210,148,'BLUES SHAMAN',15,'#dcebf0',700,'middle','font-family="Brush Script MT,Segoe Script,cursive"')+T(210,164,'ASCENSION',6,'#b7d2dd',800,'middle','letter-spacing="1.2"');
        s+=metalSwitch(143,193,9)+metalSwitch(277,193,9)+T(143,213,'BOOST',5,'#e4edf0')+T(277,213,'BYPASS',5,'#e4edf0');
        return wrap(s,'Rivera Blues Shaman reference for RIV BLUEFLOG · blue wide two-switch enclosure');
      }
      case 'EFX|TURBO OD · IMAGE':
        return standard(model,{body:'#e3c22d',edge:'#9e8521',top:'#ebce39',topH:95,check:true,topInk:'#2b2619',knobs:[[177,56,8,'#171a1a',-35,'LEVEL'],[243,56,8,'#171a1a',-35,'TONE'],[210,85,8,'#171a1a',-35,'DRIVE']],midText:'Turbo OverDrive',midY:137,midSize:13,midInk:'#191c1b',midWeight:900,name:'OD-2',nameY:153,nameSize:9,nameColor:'#191c1b',padColor:'#22272a',logoColor:'#111517',logoY:215});
      default:return null;
    }
  }
  window.renderPedalReferenceSvg=function(blockId,modelName){
    const display=String(modelName||'').trim();
    const base=display.replace(/\s*·\s*IMAGE$/i,'').trim();
    const aliases={
      'MOD|CE-2':'CE-2','MOD|Detune':'Detune','RVB|Damp':'Damp','DLY|Phi Delay':'Phi Delay',
      'VOL|Volume':'Volume','WAH|Clyde':'Wah Pedal','WAH|Cry BB':'Wah Pedal','WAH|V847':'Wah Pedal','WAH|Horse Wah':'Wah Pedal','WAH|Octave-Shift':'Octave-Shift',
      'RVB|Room':'Room','RVB|Hall':'Hall','RVB|Plate':'Plate','RVB|Spring':'Spring','RVB|Shimmer':'Shimmer',
      'DLY|Analog Delay':'Analog Delay','DLY|Digital Delay':'Digital Delay','DLY|Modulation':'Modulation','DLY|Tape Echo':'Tape Echo','DLY|Reverse':'Reverse','DLY|Pan Delay':'Pan Delay','DLY|Duotime':'Duotime',
      'MOD|CE-1':'CE-1','MOD|St Chorus':'St Chorus','MOD|Vibrator':'Vibrator','MOD|Flanger':'Flanger','MOD|Phase 90':'Phase 90','MOD|Phase 100':'Phase 100','MOD|SCF':'SCF','MOD|U-Vibe':'U-Vibe','MOD|Tremolo':'Tremolo','MOD|Rotary':'Rotary','MOD|Harmonist':'Harmonist','MOD|SCH-1':'SCH-1','MOD|Mono Octave':'Mono Octave',
      'CMP|Rose Comp':'Rose Comp','CMP|K Comp':'K Comp','CMP|Studio Comp':'Studio Comp',
      'EQ|6-Band EQ':'6-Band EQ','EQ|Align EQ':'Align EQ','EQ|10-Band EQ':'10-Band EQ','EQ|Para EQ':'Para EQ',
      'EFX|Distortion+':'Distortion+','EFX|RC Boost':'RC Boost','EFX|AC Boost':'AC Boost','EFX|Dist One':'Dist One','EFX|T Scream':'T Scream','EFX|Blues Drv':'Blues Drv','EFX|Morning Drv':'Morning Drv','EFX|Eat Dist':'Eat Dist','EFX|Red Dirt':'Red Dirt','EFX|Crunch':'Crunch','EFX|Muff Fuzz':'Muff Fuzz','EFX|Katana':'Katana','EFX|ST Singer':'ST Singer','EFX|Red Fuzz':'Red Fuzz','EFX|Touch Wah':'Touch Wah'
    };
    let model=aliases[blockId+'|'+base]||null;
    if(blockId==='EFX'&&base==='Full-OD HP')model='Full-OD HP · IMAGE';
    if(blockId==='EFX'&&base==='Horseman OD')model='Horseman OD · IMAGE';
    if(blockId==='EFX'&&base==='NOB ODR')model='NOB ODR · IMAGE';
    if(blockId==='EFX'&&base==='RIV BLUEFLOG')model='RIV BLUEFLOG · IMAGE';
    if(blockId==='EFX'&&base==='TURBO OD')model='TURBO OD · IMAGE';
    if(blockId==='GATE'&&base==='Noise Gate')model='Noise Gate';
    if(!model)return null;
    return draw(model,blockId);
  };

  // Vite defers module scripts until HTML parsing is complete. The main editor
  // is still a classic inline script and performs its first render before this
  // module executes, so refresh the visual once the SVG renderer is available.
  if (typeof document !== 'undefined') {
    const refreshInitialPedalArtwork = () => {
      if (typeof window.renderModelVisual === 'function') window.renderModelVisual();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refreshInitialPedalArtwork, { once: true });
    } else {
      queueMicrotask(refreshInitialPedalArtwork);
    }
  }
})();
