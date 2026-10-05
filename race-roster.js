(() => {
'use strict';
const originals = [
      { name: 'Veltrix Motorsport', code: 'VTX', slug: 'veltrix', color: '#d9363e', accent: '#171a1f' },
      { name: 'Apex Nova Racing', code: 'ANR', slug: 'apexnova', color: '#ff7a24', accent: '#1d2430' },
      { name: 'Orion Grand Prix', code: 'ORN', slug: 'oriongp', color: '#6657d9', accent: '#f2d45c' },
      { name: 'Blackridge Racing', code: 'BLR', slug: 'blackridge', color: '#262a30', accent: '#d6e04b' },
      { name: 'Vanguard Motorsport', code: 'VAN', slug: 'vanguard', color: '#1f8a70', accent: '#e7e1cf' },
      { name: 'Solstice Racing', code: 'SOL', slug: 'solstice', color: '#e9a23b', accent: '#3d2f56' },
      { name: 'Crimson Arrow GP', code: 'CAG', slug: 'crimsonarrow', color: '#b51f36', accent: '#f2efe8' },
      { name: 'Titan Motorsport', code: 'TTN', slug: 'titan', color: '#42526e', accent: '#f0a934' },
      { name: 'Eclipse Performance', code: 'ECL', slug: 'eclipse', color: '#25232d', accent: '#b56ad9' },
      { name: 'Northstar Racing', code: 'NSR', slug: 'northstar', color: '#2774c7', accent: '#dcecff' },
      { name: 'Monarch Grand Prix', code: 'MGP', slug: 'monarchgp', color: '#7b2344', accent: '#d9b65d' }
    ];
const originalDrivers = {
    veltrix: [['AKL', 'Adrian Keller'], ['LMO', 'Luca Moretti']],
    apexnova: [['ECO', 'Ethan Cole'], ['MRI', 'Matteo Ricci']],
    oriongp: [['JME', 'Julien Mercier'], ['RCO', 'Rafael Costa']],
    blackridge: [['MRE', 'Mason Reed'], ['FNY', 'Frederik Nygaard']],
    vanguard: [['AFA', 'Alexander Falk'], ['HLA', 'Hugo Laurent']],
    solstice: [['TME', 'Thiago Mendes'], ['OHA', 'Oliver Hayes']],
    crimsonarrow: [['MBE', 'Marco Bellini'], ['LST', 'Lukas Steiner']],
    titan: [['VKO', 'Victor Kovalenko'], ['DSO', 'Daniel Sørensen']],
    eclipse: [['GFO', 'Gabriel Fournier'], ['NVA', 'Nico Valente']],
    northstar: [['EBE', 'Elias Bergström'], ['JBE', 'Jack Bennett']],
    monarchgp: [['ABE', 'Arthur Beaumont'], ['DNA', 'Diego Navarro']],
  };
const reserves = [
 {name:'Phantom Works Racing',code:'PWR',slug:'phantom',color:'#8e9bae',accent:'#e4ebf3',speed:314,drivers:[['EVG','Emil Varga'],['NBR','Nathan Brooks']]},
 {name:'Helix Motorsport',code:'HLX',slug:'helix',color:'#24b6a8',accent:'#e4f8b3',speed:312,drivers:[['TZI','Tomasz Zielinski'],['RDU','Rémi Dubois']]},
 {name:'Vertex Grand Prix',code:'VRX',slug:'vertex',color:'#8470ed',accent:'#e9dfaa',speed:310,drivers:[['ASE','Antonio Serra'],['CBL','Connor Blake']]},
 {name:'Argent Racing',code:'ARG',slug:'argent',color:'#99afc3',accent:'#ffffff',speed:308,drivers:[['LDE','Louis Delacroix'],['EMA','Enzo Marin']]},
 {name:'Falcon Dynamics',code:'FDN',slug:'falcon',color:'#26a0df',accent:'#ffcf51',speed:306,drivers:[['MLI','Marcus Lind'],['AVE','Alejandro Vega']]},
 {name:'Tempest Motorsport',code:'TMP',slug:'tempest',color:'#da6ba5',accent:'#322740',speed:304,drivers:[['CSH','Callum Shaw'],['TRI','Tiago Ribeiro']]}
];
const catalog = [...originals.map((t,i)=>({...t,speed:320-i*2,drivers:originalDrivers[t.slug]})),...reserves];
const drivers = catalog.flatMap(t=>t.drivers.map(([code,name])=>({code,name})));
const defaults = () => originals.map(t=>({slug:t.slug,pilots:originalDrivers[t.slug].map(p=>p[0])}));
const key='apex-grid-v1';
function validate(grid) {
 return Array.isArray(grid)&&grid.length===11&&new Set(grid.map(t=>t.slug)).size===11&&grid.every(t=>catalog.some(c=>c.slug===t.slug)&&Array.isArray(t.pilots)&&t.pilots.length===2&&t.pilots.every(p=>drivers.some(d=>d.code===p)))&&new Set(grid.flatMap(t=>t.pilots)).size===22;
}
let grid=defaults(); try {const saved=JSON.parse(localStorage.getItem(key)); if(validate(saved))grid=saved;}catch(_){}
window.RaceRoster={catalog,drivers,defaults,validate,grid,locked:false,activeTeams:()=>grid.map(row=>({...catalog.find(t=>t.slug===row.slug),pilots:row.pilots})),save(next){if(this.locked)throw Error('Yarış bittikten sonra kadroyu değiştirebilirsin.');if(!validate(next))throw Error('Her takım ve pilot yalnızca bir kez seçilebilir.');window.RaceCareer?.syncGrid(next);localStorage.setItem(key,JSON.stringify(next));}};
})();