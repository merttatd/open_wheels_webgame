(() => {
 window.RaceDrivers=Object.freeze({build:teams=>teams.flatMap(team=>team.pilots.map((code,seat)=>({id:`${team.slug}-${code}`,team,code,name:RaceRoster.drivers.find(d=>d.code===code).name,seat})))});
})();