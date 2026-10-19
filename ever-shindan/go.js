// 旧URL → /shindan/（?mail= や ?r= はそのまま引き継ぐ）
location.replace('../shindan/' + location.search + location.hash);
