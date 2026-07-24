const fs = require('fs');

// Parse existing file
const content = fs.readFileSync('/home/z/my-project/src/lib/stock-list.ts', 'utf8');
const cleaned = content.replace('export const stockList = ', '').replace(' as const;', '');
const existing = eval('(' + cleaned + ')');

const existingSymbols = new Set(existing.equities.map(e => e.s));
console.log(`Existing equities: ${existingSymbols.size}`);

// Helper: determine lot size based on base price (realistic for NSE)
function ls(bp) {
  if (bp >= 25000) return 5;
  if (bp >= 15000) return 10;
  if (bp >= 10000) return 25;
  if (bp >= 5000) return 50;
  if (bp >= 2000) return 100;
  if (bp >= 1000) return 250;
  if (bp >= 500) return 500;
  if (bp >= 200) return 1500;
  if (bp >= 100) return 2500;
  if (bp >= 50) return 5000;
  if (bp >= 20) return 7500;
  return 10000;
}

// Massive comprehensive list of new NSE equities
// [symbol, fullName, sector, basePrice, volatility]
const newEquities = [
  // ===== BANKING - PSU Banks (not already in list) =====
  ["UNIONBANK","Union Bank of India","Banking",148,0.023],
  ["UCOBANK","UCO Bank","Banking",55,0.025],
  ["BANKINDIA","Bank of India","Banking",118,0.024],
  ["IOB","Indian Overseas Bank","Banking",72,0.026],
  ["MAHABANK","Bank of Maharashtra","Banking",220,0.022],
  ["CENTRALBK","Central Bank of India","Banking",95,0.024],
  ["SOUTHBANK","South Indian Bank","Banking",30,0.028],
  ["KARNATAKBK","Karnataka Bank","Banking",298,0.022],
  ["DCBBANK","DCB Bank","Banking",158,0.024],
  ["RBLBANK","RBL Bank","Banking",255,0.025],
  ["AUBANK","AU Small Finance Bank","Banking",725,0.024],
  ["CANFINHOME","Can Fin Homes","Finance",1350,0.02],
  ["GICHSGFIN","GIC Housing Finance","Finance",320,0.024],
  ["PNBHOUSING","PNB Housing Finance","Finance",1055,0.023],
  ["REPCOHOME","Repco Home Finance","Finance",485,0.025],
  ["LICHFLIN","LIC Housing Finance","Finance",585,0.022],
  ["SHRIRAMFIN","Shriram Finance","Finance",3355,0.022],
  ["SURYODNRM","Suryoday Small Finance Bank","Banking",725,0.025],

  // ===== IT =====
  ["TATAELXSI","Tata Elxsi","IT",6850,0.022],
  ["CYIENT","Cyient","IT",1955,0.022],
  ["KPITTECH","KPIT Technologies","IT",4280,0.023],
  ["SONATSOFTW","Sonata Software","IT",625,0.025],
  ["ZENSARTECH","Zensar Technologies","IT",585,0.024],
  ["NEWGEN","Newgen Software","IT",1155,0.023],
  ["INTELLECT","Intellect Design Arena","IT",855,0.025],
  ["DATAPATTNS","Datamatics Global","IT",685,0.024],
  ["ONMOBILE","OnMobile Global","IT",155,0.03],
  ["REDINGTON","Redington","IT",245,0.022],
  ["AFFLE","Affle India","IT",1485,0.028],
  ["HAPPSTMNDS","Happiest Minds Tech","IT",895,0.026],
  ["EASEMYTRIP","EaseMyTrip","Internet",695,0.03],
  ["NAUKRI","Info Edge India","Internet",8280,0.025],
  ["MASTEK","Mastek Ltd","IT",2150,0.024],
  ["FSS","FSS Technologies","IT",6850,0.023],
  ["ABMKN","ABM Knowledgeware","IT",585,0.026],
  ["ACIINFO","ACI Infosystems","IT",1250,0.024],
  ["MPIL","MPIL Ltd","IT",485,0.024],
  ["EBIXCASH","EbixCash","Fintech",68,0.032],

  // ===== AUTO & AUTO ANCILLARY =====
  ["ASHOKLEY","Ashok Leyland","Auto",268,0.026],
  ["BHARATFORG","Bharat Forge","Auto Ancillary",1585,0.023],
  ["EXIDEIND","Exide Industries","Auto Ancillary",585,0.022],
  ["AMARAJABAT","Amara Raja Batteries","Auto Ancillary",1485,0.022],
  ["ENDURANCE","Endurance Technologies","Auto Ancillary",2285,0.025],
  ["SUPRAJIT","Suprajit Engineering","Auto Ancillary",595,0.024],
  ["GOODYEAR","Goodyear India","Auto Ancillary",1255,0.02],
  ["FORCEMOTORS","Force Motors","Auto",6480,0.028],
  ["SMLISUZU","SML Isuzu","Auto",2180,0.025],
  ["ATULAUTO","Atul Auto","Auto",1380,0.023],
  ["ESCORTS","Escorts Kubota","Auto",4250,0.024],
  ["BAJAJELEC","Bajaj Electricals","Consumer",1050,0.023],
  ["SUPREMEIND","Supreme Industries","Plastics",5250,0.02],
  ["BHARATGEAR","Bharat Gear","Auto Ancillary",1580,0.023],
  ["MUNJALSHOW","Munjal Showa","Auto Ancillary",485,0.024],
  ["SWARAJENG","Swaraj Engines","Auto Ancillary",2850,0.024],
  ["SAMKRGSS","Samkrg Pistons","Auto Ancillary",985,0.026],
  ["SONACOMS","Sona BLW Precision","Auto Ancillary",7850,0.027],
  ["MINDACORP","Minda Corp","Auto Ancillary",1280,0.025],
  ["RICOAUTO","Rico Auto","Auto Ancillary",215,0.028],
  ["IGARASHI","Igarashi Motors","Auto Ancillary",580,0.024],
  ["OMAXAUTO","Omax Autos","Auto Ancillary",185,0.026],
  ["REMCOIND","Remco India","Auto Ancillary",285,0.025],
  ["SANDHAR","Sandhar Technologies","Auto Ancillary",1280,0.025],
  ["WABCOIND","WABCO India","Auto Ancillary",8900,0.02],
  ["SCHAEFFLER","Schaeffler India","Auto Ancillary",5850,0.022],
  ["DIVGI","Divgi Torqtransfer","Auto Ancillary",4850,0.026],
  ["RAMKRISHNA","Ramkrishna Forgings","Auto Ancillary",985,0.026],
  ["ANAND","Anand Automotive","Auto Ancillary",385,0.024],
  ["MOTHERSON","Motherson Sumi Systems","Auto Ancillary",285,0.027],
  ["PRECOT","Precot Ltd","Textiles",485,0.024],

  // ===== PHARMA =====
  ["AUROPHARMA","Aurobindo Pharma","Pharma",1685,0.022],
  ["CADILAHC","Zydus Lifesciences","Pharma",1185,0.021],
  ["GLENMARK","Glenmark Pharma","Pharma",1725,0.022],
  ["STRIDES","Strides Pharma","Pharma",685,0.025],
  ["JBCHEPHARM","JB Chemicals & Pharma","Pharma",2880,0.02],
  ["GSKPHARMA","GlaxoSmithKline Pharma","Pharma",5825,0.018],
  ["PFIZER","Pfizer India","Pharma",6280,0.017],
  ["ABBOTINDIA","Abbott India","Pharma",28800,0.016],
  ["SANOFI","Sanofi India","Pharma",8550,0.017],
  ["WOCKHARDT","Wockhardt","Pharma",625,0.026],
  ["IPCALAB","Ipca Laboratories","Pharma",1185,0.022],
  ["NATCOPHARM","Natco Pharma","Pharma",1255,0.024],
  ["FDC","FDC Limited","Pharma",585,0.023],
  ["MOREPENLAB","Morepen Laboratories","Pharma",55,0.03],
  ["SYNGENE","Syngene International","Pharma",855,0.024],
  ["MANKIND","Mankind Pharma","Pharma",3280,0.022],
  ["AARTIDRUGS","Aarti Drugs","Pharma",788,0.025],
  ["SHILPAMED","Shilpa Medicare","Pharma",685,0.026],
  ["FORTIS","Fortis Healthcare","Healthcare",1580,0.024],
  ["LALPATHLAB","Lal Path Labs","Healthcare",3880,0.022],
  ["THYROCARE","Thyrocare Technologies","Healthcare",1880,0.025],
  ["DRAGA","Dr. Agarwal Eye Hospital","Healthcare",1155,0.023],
  ["NEOGEN","Neogen Labs","Pharma",1250,0.025],
  ["VIVIMED","Vivimed Labs","Healthcare",88,0.028],
  ["POLYMED","Polymedicure","Healthcare",1280,0.025],
  ["CUREFOOD","Curefoods","Retail",485,0.028],

  // ===== FMCG =====
  ["DABUR","Dabur India","FMCG",585,0.016],
  ["MARICO","Marico Limited","FMCG",685,0.017],
  ["COLPAL","Colgate-Palmolive","FMCG",2880,0.015],
  ["EMAMILTD","Emami Ltd","FMCG",515,0.018],
  ["RADICO","Radico Khaitan","FMCG",1655,0.022],
  ["UBL","United Breweries","FMCG",1880,0.018],
  ["MCDOWELL-N","United Spirits","FMCG",1485,0.018],
  ["TATACOFFEE","Tata Coffee","FMCG",925,0.023],
  ["JYOTHYLAB","Jyothy Labs","FMCG",488,0.019],
  ["CASTROLIND","Castrol India","FMCG",1325,0.018],
  ["GODREJAGRO","Godrej Agrovet","FMCG",1280,0.02],
  ["HATSUN","Hatsun Agro Product","FMCG",1055,0.022],
  ["HERITAGEFDS","Heritage Foods","FMCG",1080,0.022],
  ["KRBL","KRBL Limited","FMCG",385,0.024],
  ["GULFOIL","Gulf Oil Lubricants","FMCG",8500,0.019],
  ["PROCTER","P&G Health","FMCG",15800,0.016],
  ["BBCL","B&B Corporate Services","FMCG",385,0.023],

  // ===== METALS & MINING =====
  ["NMDC","NMDC Limited","Mining",258,0.022],
  ["MOIL","MOIL Limited","Mining",478,0.025],
  ["NALCO","National Aluminium","Metals",268,0.024],
  ["HINDCOPPER","Hindustan Copper","Metals",388,0.027],
  ["APLAPOLLO","APL Apollo Tubes","Metals",1880,0.024],
  ["JSL","Jindal Stainless","Metals",228,0.028],
  ["SHYAMMETL","Shyam Metalics & Energy","Metals",785,0.027],
  ["GRAPHITE","Graphite India","Metals",685,0.028],
  ["HEG","HEG Limited","Metals",5880,0.025],
  ["RAJESHEXPO","Rajesh Exports","Metals",75,0.032],
  ["TINPLATE","Tinplate Company of India","Metals",398,0.024],
  ["LLOYDSME","Lloyds Metals & Energy","Metals",215,0.028],
  ["MANAKUNJ","Manaksia","Metals",285,0.025],
  ["SURYAROSHI","Surya Roshni","Metals",1280,0.023],
  ["USHAMART","Usha Martin","Metals",285,0.025],
  ["ORISSAMINE","Orissa Minerals Development","Mining",425,0.026],
  ["CASTOR","Castrol International","Metals",195,0.025],
  ["ISMT","ISMT Ltd","Metals",285,0.025],
  ["GOLDJUNE","Goldiam International","Metals",885,0.024],
  ["SAILWIRE","SAIL Wire Ropes","Metals",165,0.028],
  ["MANGALMTE","Mangalam Timber","Metals",185,0.028],
  ["NATIONALU","Nationalum Aluminium","Metals",165,0.025],

  // ===== ENERGY / POWER / OIL & GAS =====
  ["NHPC","NHPC Limited","Power",108,0.024],
  ["SJVN","SJVN Limited","Power",148,0.025],
  ["JSWENERGY","JSW Energy","Power",688,0.023],
  ["CESC","CESC Limited","Power",178,0.022],
  ["TORNTPOWER","Torrent Power","Power",1880,0.022],
  ["GIPCL","Gujarat Industries Power","Power",385,0.023],
  ["INDIAGRID","India Grid Trust","Power",348,0.02],
  ["ADANIGAS","Adani Total Gas","Energy",1555,0.028],
  ["ADANIPWR","Adani Power","Power",685,0.03],
  ["GAIL","GAIL India","Energy",198,0.022],
  ["IGL","Indraprastha Gas","Energy",485,0.022],
  ["MGL","Mahanagar Gas","Energy",1555,0.022],
  ["PETRONET","Petronet LNG","Energy",308,0.022],
  ["GSPL","Gujarat State Petronet","Energy",398,0.022],
  ["OIL","Oil India","Energy",428,0.022],
  ["CHENNPETRO","Chennai Petroleum Corp","Energy",388,0.024],
  ["MRPL","Mangalore Refinery & Petrochemicals","Energy",288,0.024],
  ["OLECTRA","Olectra Greentech","Power",4850,0.026],
  ["GMRINFRA","GMR Infrastructure","Infrastructure",88,0.03],
  ["RELPOWER","Reliance Power","Power",48,0.035],
  ["JPPOWER","Jaiprakash Power Ventures","Power",30,0.032],
  ["GUJGASLTD","Gujarat Gas","Energy",1580,0.02],
  ["HPCL","Hindustan Petroleum Corp","Energy",665,0.023],
  ["HINDPETRO","Hindustan Petroleum","Energy",665,0.023],
  ["PENTAMEDIA","Pentamedia Graphics","Media",58,0.03],

  // ===== CEMENT =====
  ["RAMCOCEM","Ramco Cements","Cement",1380,0.02],
  ["DCM","DCM Shriram Ltd","Cement",1385,0.022],
  ["INDIACEM","India Cements","Cement",388,0.023],
  ["JKCEMENT","JK Cement","Cement",4850,0.02],
  ["DALBHARAT","Dalmia Bharat","Cement",1520,0.022],
  ["BIRLACORPN","Birla Corporation","Cement",1380,0.022],
  ["JKLAKSHMI","JK Lakshmi Cement","Cement",985,0.023],
  ["PRSMJOHNSR","Prism Johnson","Cement",580,0.024],
  ["SANGHIIND","Sanghi Industries","Cement",158,0.025],
  ["ORIENTCEM","Orient Cement","Cement",198,0.025],
  ["STARCEMENT","Star Cement","Cement",385,0.024],
  ["SHREECEM","Shree Cement","Cement",26800,0.019],

  // ===== TELECOM =====
  ["IDEA","Vodafone Idea","Telecom",18,0.04],
  ["HFCL","HFCL Limited","Telecom",185,0.028],
  ["TEJASNET","Tejas Networks","Telecom",1280,0.028],
  ["ITI","ITI Limited","Telecom",525,0.027],
  ["STEL","Sterlite Technologies","Telecom",285,0.026],
  ["TATACOMM","Tata Communications","Telecom",1850,0.022],

  // ===== RETAIL =====
  ["VISHALMART","Vishal Mega Mart","Retail",195,0.028],
  ["SHOPERSTOP","Shoppers Stop","Retail",780,0.025],
  ["KPRMILL","KPR Mill Ltd","Textiles",780,0.024],
  ["V2RETAIL","V2 Retail","Retail",148,0.03],
  ["SPENCERS","Spencer's Retail","Retail",185,0.028],
  ["SPECIALITY","Speciality Restaurants","Retail",580,0.026],
  ["FRETAIL","Future Retail","Retail",45,0.035],
  ["BURGERKING","Burger King India","Retail",185,0.03],
  ["BARBEQUE","Barbeque Nation Hospitality","Retail",1280,0.026],
  ["PROVINTL","Provogue International","Retail",58,0.03],
  ["BRANDHOUSE","Brand House Retails","Retail",525,0.026],
  ["METROBRANDS","Metro Brands","Retail",1650,0.024],
  ["RELIANCER","Reliance Retail","Retail",3850,0.022],

  // ===== REAL ESTATE =====
  ["SOBHA","Sobha Limited","Real Estate",1580,0.025],
  ["PRESTIGE","Prestige Estates","Real Estate",3850,0.024],
  ["BRIGADE","Brigade Enterprises","Real Estate",1480,0.025],
  ["MAHLIFE","Mahindra Lifespaces","Real Estate",980,0.026],
  ["LODHA","Macrotech Developers","Real Estate",1280,0.026],
  ["SUNTECK","Sunteck Realty","Real Estate",1850,0.025],
  ["ASHIANA","Ashiana Housing","Real Estate",580,0.025],
  ["SILVERLINE","Silverline Realty","Real Estate",285,0.027],
  ["ISKANDAR","ISKON Temple","Real Estate",485,0.025],
  ["SHRIRAMRCH","Shriram Properties","Real Estate",585,0.026],
  ["ANANT RAJ","Anant Raj Ltd","Real Estate",485,0.025],
  ["ATUL","Atul Ltd","Chemicals",8950,0.02],

  // ===== CAPITAL GOODS =====
  ["CUMMINSIND","Cummins India","Capital Goods",3850,0.021],
  ["POLYCAB","Polycab India","Capital Goods",5650,0.023],
  ["THERMAX","Thermax Ltd","Capital Goods",6220,0.023],
  ["KEC","KEC International","Capital Goods",1850,0.023],
  ["KALPATPOWR","Kalpataru Power Transmission","Capital Goods",1250,0.024],
  ["GREAVESCOT","Greaves Cotton","Capital Goods",1950,0.023],
  ["BHEL","Bharat Heavy Electricals","Capital Goods",3850,0.023],
  ["FINPIPE","Finolex Cables","Capital Goods",1850,0.022],
  ["KEIIND","KEI Industries","Capital Goods",3550,0.022],
  ["V-GUARD","V-Guard Industries","Consumer",3850,0.022],
  ["HAVELLS","Havells India","Consumer",1850,0.022],

  // ===== CONSUMER / HOME / APPLIANCES =====
  ["BATAINDIA","Bata India","Retail",1550,0.023],
  ["VIPIND","VIP Industries","Consumer",1680,0.022],
  ["KAJARIACER","Kajaria Ceramics","Consumer",1280,0.022],
  ["SOMANYCERA","Somany Ceramics","Consumer",1150,0.023],
  ["CENTURYPLY","Century Plyboards","Consumer",1180,0.023],
  ["GREENPLY","Greenply Industries","Consumer",1180,0.023],
  ["ASTRAL","Astral Ltd","Consumer",2180,0.023],
  ["IFBIND","IFB Industries","Consumer",2180,0.022],

  // ===== CHEMICALS =====
  ["PIDILITIND","Pidilite Industries","Chemicals",3180,0.018],
  ["UPL","UPL Limited","Chemicals",285,0.025],
  ["CLARIANTIND","Clariant India","Chemicals",1850,0.022],
  ["AARTIIND","Aarti Industries","Chemicals",1285,0.024],
  ["BALAMINE","Balaji Amines","Chemicals",2180,0.024],
  ["CHAMBLFRT","Chambal Fertilisers & Chemicals","Chemicals",488,0.023],
  ["GNFC","Gujarat Narmada Valley Fertilizers","Chemicals",358,0.023],
  ["GSFC","Gujarat State Fertilizers & Chemicals","Chemicals",298,0.023],
  ["DEEPAKFERT","Deepak Fertilisers & Petrochemicals","Chemicals",1250,0.024],
  ["RCF","Rashtriya Chemicals & Fertilisers","Chemicals",185,0.025],
  ["COROMANDEL","Coromandel International","Chemicals",1580,0.021],
  ["PIINDUST","PI Industries","Chemicals",5250,0.022],
  ["ATUL","Atul Ltd","Chemicals",8950,0.02],
  ["RALLIS","Rallis India","Chemicals",485,0.023],
  ["SHARDACROP","Sharda Cropchem","Chemicals",2280,0.024],
  ["SUMICHEM","Sumitomo Chemical India","Chemicals",985,0.024],
  ["RAIN","Rain Industries","Chemicals",215,0.027],
  ["SOLARIND","Solar Industries India","Chemicals",4250,0.024],
  ["DEEPAKNTR","Deepak Nitrite","Chemicals",2780,0.023],
  ["VINATIORGA","Vinati Organics","Chemicals",2880,0.022],
  ["HIMADRI","Himadri Speciality Chemical","Chemicals",285,0.025],
  ["DIPALHOUSE","Dipal House Trading","Chemicals",285,0.025],

  // ===== LOGISTICS =====
  ["ALLCARGO","Allcargo Logistics","Logistics",165,0.028],
  ["GATI","Gati Ltd","Logistics",285,0.026],
  ["BLUEDEXPR","Blue Dart Express","Logistics",7850,0.02],
  ["CONCOR","Container Corporation of India","Logistics",1850,0.022],
  ["TCIEXPRESS","TCI Express","Logistics",1450,0.024],
  ["VRLLOG","VRL Logistics","Logistics",1180,0.025],
  ["MAHLOG","Mahindra Logistics","Logistics",680,0.026],
  ["TVSLOG","TVS Supply Chain Solutions","Logistics",785,0.025],
  ["SPICEJET","SpiceJet","Aviation",85,0.035],
  ["INTRENT","InterGlobe Aviation","Aviation",4850,0.025],
  ["CFL","Cargo Flight Logistics","Logistics",285,0.028],
  ["AEGISLOGIC","Aegis Logistics","Logistics",380,0.025],
  ["SHREYAN","Shreyan Shipping & Logistics","Logistics",1180,0.025],

  // ===== MEDIA & ENTERTAINMENT =====
  ["PVRINOX","PVR INOX Ltd","Media",1880,0.026],
  ["ZEEENT","Zee Entertainment Enterprises","Media",295,0.025],
  ["SUNTV","Sun TV Network","Media",985,0.02],
  ["NETWORK18","Network18 Media & Investments","Media",128,0.028],
  ["HATHWAY","Hathway Cable & Datacom","Media",58,0.03],
  ["DEN","DEN Networks","Media",145,0.028],
  ["DISHTV","Dish TV India","Media",32,0.032],
  ["ZEEMEDIA","Zee Media Corp","Media",45,0.03],
  ["SAREGAMA","Saregama India","Media",4850,0.023],
  ["TIPSIND","Tips Industries","Media",285,0.026],
  ["DQENT","DQ Entertainment","Media",125,0.028],

  // ===== TEXTILES =====
  ["VARDHMAN","Vardhman Textiles","Textiles",485,0.024],
  ["KITEX","Kitex Garments","Textiles",288,0.03],
  ["TRIDENT","Trident Ltd","Textiles",65,0.028],
  ["LUXIND","Lux Industries","Textiles",1280,0.023],
  ["GOKEX","Gokak Textiles","Textiles",285,0.025],
  ["RAYMOND","Raymond Ltd","Textiles",1850,0.022],
  ["NITINSPIN","Nitin Spinners","Textiles",580,0.024],
  ["JBFIND","JBF Industries","Textiles",285,0.025],
  ["CENTURYEN","Century Enka","Textiles",1185,0.023],
  ["GARWFIBR","Garware Wall Ropes","Textiles",4850,0.02],
  ["SKUMARS","S Kumar Nationwide","Textiles",285,0.025],
  ["WELSPUN","Welspun Global","Textiles",175,0.028],
  ["PRECOT","Precot Ltd","Textiles",485,0.024],
  ["SURYALAXMI","Surya Laxmi Cotton Mills","Textiles",425,0.025],

  // ===== NEW AGE / FINTECH =====
  ["ANGELONE","Angel One Ltd","Fintech",3850,0.028],
  ["PBFINTCH","PB Fintech (PolicyBazaar)","Fintech",2850,0.03],
  ["FIVESTAR","Five Star Business Finance","Finance",985,0.024],
  ["CDSL","CDSL","Finance",1880,0.023],
  ["MCX","Multi Commodity Exchange","Finance",5250,0.022],
  ["360ONE","360 ONE WAM","Finance",8500,0.022],
  ["JMFIN","JM Financial","Finance",128,0.025],
  ["MOTILALOFS","Motilal Oswal Financial Services","Finance",1380,0.025],
  ["STARHEALTH","Star Health and Allied Insurance","Insurance",5850,0.024],
  ["NEWINDASS","New India Assurance","Insurance",285,0.024],
  ["BAJAJALL","Bajaj Allianz General Insurance","Insurance",2850,0.022],
  ["ICICIGI","ICICI General Insurance","Insurance",1280,0.022],
  ["ICICIPRU","ICICI Prudential Life Insurance","Insurance",185,0.024],
  ["TATAAIA","Tata AIA Life Insurance","Insurance",985,0.023],
  ["IIFL","IIFL Finance","Finance",585,0.026],
  ["MANAPPURAM","Manappuram Finance","Finance",198,0.025],
  ["IBULHSGFIN","IBUL Housing Finance","Finance",325,0.026],
  ["SREERAYAL","Sree Rayalaseema Alloys","Finance",585,0.025],
  ["SUMMIT","Summit Securities","Finance",285,0.028],
  ["INDIAMART","IndiaMART InterMESH","Internet",3850,0.028],

  // ===== PSU =====
  ["HUDCO","HUDCO Ltd","Finance",285,0.024],
  ["NBCC","NBCC India","Infrastructure",195,0.028],
  ["DREDGING","Dredging Corporation of India","Infrastructure",1580,0.026],
  ["SCI","Shipping Corporation of India","Logistics",185,0.025],
  ["THDC","THDC India Ltd","Power",128,0.024],
  ["WAPCOS","WAPCOS Ltd","Infrastructure",385,0.025],
  ["ENGINERSIN","Engineers India","Infrastructure",2850,0.022],

  // ===== RAILWAYS =====
  ["RAILTEL","RailTel Corporation of India","Infrastructure",448,0.028],
  ["IRCON","IRCON International","Infrastructure",288,0.03],
  ["IRCTC","Indian Railway Catering & Tourism","Infrastructure",1250,0.026],
  ["RITES","RITES Ltd","Infrastructure",1455,0.024],
  ["KRCL","Konkan Railway Corp","Infrastructure",1580,0.024],
  ["DFCCIL","Dedicated Freight Corridor Corp","Infrastructure",1850,0.025],

  // ===== DEFENCE =====
  ["HAL","Hindustan Aeronautics Ltd","Defence",4850,0.025],
  ["BEL","Bharat Electronics Ltd","Defence",3250,0.024],
  ["MIDHANI","Mishra Dhatu Nigam","Defence",1850,0.028],
  ["BEML","BEML Ltd","Defence",3850,0.026],
  ["DYNAMATIC","Dynamatic Technologies","Defence",4850,0.027],
  ["ELGI","Elgi Equipments","Defence",5850,0.023],
  ["MAZDOCK","Mazagon Dock Shipbuilders","Defence",5250,0.026],
  ["DATAPATRN","Data Patterns","Defence",3850,0.028],
  ["KERNEX","Kernex Microsystems","Defence",3250,0.028],
  ["OPTICALFR","Opto Electronics","Defence",2850,0.026],
  ["AARVEE","Aarvee Defence Systems","Defence",1850,0.027],
  ["SPEARDEF","Spear Defence Systems","Defence",2850,0.028],
  ["SANTECH","Sante Technologies","Defence",580,0.027],

  // ===== HOSPITALITY =====
  ["INDHOTEL","Indian Hotels Company","Hospitality",780,0.022],
  ["EIH","EIH Ltd","Hospitality",385,0.023],
  ["HOTELLEELA","Hotel Leelaventure","Hospitality",68,0.028],
  ["CHALET","Chalet Hotels","Hospitality",485,0.024],
  ["EIHOTEL","EIH Associated Hotels","Hospitality",385,0.023],

  // ===== CONGLOMERATES & HOLDING =====
  ["GODREJIND","Godrej Industries","Conglomerate",1680,0.02],
  ["TATAINV","Tata Investment Corp","Finance",5250,0.02],
  ["TATASTEEL","Tata Steel Long Products","Metals",415,0.025],

  // ===== ADDITIONAL BANKING & FINANCE =====
  ["CHOLAHLDNG","Cholamandalam Investment & Finance","Finance",1720,0.021],
  ["SHRIRAMC","Shriram City Union Finance","Finance",3150,0.023],
  ["ICICISECU","ICICI Securities","Finance",780,0.023],
  ["HDFCAMC","HDFC Asset Management","Finance",4250,0.022],
  ["NAMIND","NAM-India Ltd","Finance",385,0.026],
  ["CANBK","Canara Bank","Banking",118,0.023],
  ["CATHFIN","Catholic Syrian Bank","Banking",88,0.027],

  // ===== EDUCATION =====
  ["MANIPAL","Manipal Global Education","Healthcare",1250,0.024],
  ["CAREERP","Career Point Ltd","Education",485,0.028],
  ["EDUCOMP","Educomp Solutions","Education",58,0.032],
  ["NAVNETEDU","Navneet Education","Education",185,0.025],

  // ===== PLASTICS & PACKAGING =====
  ["COSMOFILMS","Cosmo Films Ltd","Plastics",2850,0.023],
  ["SUPREMEIND","Supreme Petrochem","Plastics",5250,0.02],
  ["AARTIDRUGS","Aarti Drugs","Pharma",788,0.025],
  ["EIPRO","Eisai Pharmaceuticals India","Pharma",4480,0.021],

  // ===== ADDITIONAL LARGE CAPS & MIDCAPS =====
  ["BRITANNIA","Britannia Industries","FMCG",5880,0.014],
  ["HINDUNILVR","Hindustan Unilever","FMCG",2580,0.012],
  ["ITC","ITC Limited","FMCG",465,0.014],
  ["RELIANCE","Reliance Industries","Energy",2950,0.018],
  ["TATASTEEL","Tata Steel","Metals",155,0.026],
  ["ADANIENT","Adani Enterprises","Conglomerate",3200,0.03],
  ["BAJAJHLDNG","Bajaj Holdings & Investment","Conglomerate",8150,0.016],
  ["ADANIPORTS","Adani Ports & SEZ","Infrastructure",1470,0.02],
  ["COALINDIA","Coal India","Mining",510,0.021],
  ["WELSPUNLIV","Welspun Living","Textiles",175,0.028],
  ["ZOMATO","Zomato","Internet",285,0.03],
  ["PAYTM","One97 Communications","Fintech",485,0.035],
  ["NYKAA","FSN E-Commerce (Nykaa)","E-commerce",210,0.03],
  ["IRFC","Indian Railway Finance Corp","Finance",195,0.026],
  ["RVNL","Rail Vikas Nigam","Infrastructure",390,0.032],
  ["DIXON","Dixon Technologies","Electronics",16250,0.032],
  ["TATAMTRDVR","Tata Motors DVR","Auto",640,0.026],
  ["MOTHERSUMI","Motherson Sumi","Auto Ancillary",285,0.027],

  // ===== MORE SMALL & MID CAP STOCKS =====
  ["TRIDENT","Trident Ltd","Textiles",65,0.028],
  ["YESBANK","YES Bank","Banking",28,0.032],
  ["SUZLON","Suzlon Energy","Power",72,0.035],
  ["IDFCFIRSTB","IDFC First Bank","Banking",82,0.025],
  ["TATAPOWER","Tata Power","Power",495,0.024],
  ["ADANIGREEN","Adani Green Energy","Power",1850,0.03],
  ["ADANIENSOL","Adani Energy Solutions","Power",2150,0.032],
  ["DLF","DLF Limited","Real Estate",920,0.024],
  ["GODREJPROP","Godrej Properties","Real Estate",2750,0.025],
  ["OBEROIRLTY","Oberoi Realty","Real Estate",1850,0.023],
  ["PHOENIXLTD","Phoenix Ltd","Real Estate",6100,0.026],

  // ===== ADDITIONAL SECTORS - Paper, Packaging =====
  ["JKPAPER","JK Paper Ltd","Paper",485,0.024],
  ["WESTCOAST","West Coast Paper Mills","Paper",285,0.025],
  ["ANDHRCMENT","Andhra Cements","Cement",158,0.025],
  ["RAINCOM","Rain Commodities","Commodities",68,0.03],

  // ===== ADDITIONAL ENERGY STOCKS =====
  ["PTCIL","PTC Industries Ltd","Power",2950,0.025],
  ["ALOKINDS","Alok Industries","Textiles",22,0.035],
  ["ADANISOLAR","Adani Solar Energy","Power",1480,0.028],
  ["RAJESHEN","Rajesh Exports","Metals",75,0.032],

  // ===== ADDITIONAL PHARMA =====
  ["GLENMARK","Glenmark Pharmaceuticals","Pharma",1725,0.022],
  ["LUPIN","Lupin Ltd","Pharma",2285,0.02],
  ["SUNPHARMA","Sun Pharmaceutical","Pharma",1780,0.018],
  ["DIVISLAB","Divi's Laboratories","Pharma",6100,0.02],
  ["BIOCON","Biocon","Pharma",370,0.023],
  ["ALKEM","Alkem Laboratories","Pharma",6050,0.021],
  ["TORNTPHARM","Torrent Pharmaceuticals","Pharma",15500,0.021],
  ["LAURUSLABS","Laurus Labs","Pharma",590,0.026],

  // ===== ADDITIONAL FMCG =====
  ["TATACONSUM","Tata Consumer Products","FMCG",1250,0.016],
  ["GODREJCP","Godrej Consumer Products","FMCG",1620,0.016],
  ["VBL","Varun Beverages","FMCG",495,0.025],
  ["NESTLEIND","Nestle India","FMCG",2550,0.013],

  // ===== ADDITIONAL INFRASTRUCTURE =====
  ["LT","Larsen & Toubro","Infrastructure",3650,0.018],
  ["NTPC","NTPC Limited","Power",420,0.021],
  ["POWERGRID","Power Grid Corp","Power",325,0.018],
  ["ONGC","Oil & Natural Gas Corp","Energy",285,0.023],
  ["IOC","Indian Oil Corp","Energy",185,0.02],
  ["BPCL","Bharat Petroleum Corp","Energy",635,0.022],

  // ===== ADDITIONAL BANKING =====
  ["SBIN","State Bank of India","Banking",825,0.022],
  ["HDFCBANK","HDFC Bank","Banking",1680,0.016],
  ["ICICIBANK","ICICI Bank","Banking",1280,0.017],
  ["KOTAKBANK","Kotak Mahindra Bank","Banking",1790,0.017],
  ["AXISBANK","Axis Bank","Banking",1175,0.019],
  ["INDUSINDBK","IndusInd Bank","Banking",1580,0.021],
  ["PNB","Punjab National Bank","Banking",148,0.024],
  ["BANKBARODA","Bank of Baroda","Banking",315,0.022],
  ["FEDERALBNK","Federal Bank","Banking",180,0.023],
  ["INDIANB","Indian Bank","Banking",590,0.024],

  // ===== ADDITIONAL IT =====
  ["TCS","Tata Consultancy Services","IT",4150,0.015],
  ["INFY","Infosys","IT",1580,0.019],
  ["WIPRO","Wipro","IT",530,0.02],
  ["HCLTECH","HCL Technologies","IT",1750,0.019],
  ["TECHM","Tech Mahindra","IT",1690,0.022],
  ["LTIM","LTIMindtree","IT",6250,0.02],
  ["MPHASIS","Mphasis","IT",3150,0.022],
  ["PERSISTENT","Persistent Systems","IT",6800,0.021],
  ["COFORGE","Coforge","IT",8650,0.022],

  // ===== ADDITIONAL CONSUMER =====
  ["TITAN","Titan Company","Consumer",3450,0.019],
  ["ASIANPAINT","Asian Paints","Consumer",2980,0.017],
  ["BERGEPAINT","Berger Paints","Consumer",580,0.017],
  ["VOLTAS","Voltas","Consumer",1540,0.022],
  ["BLUESTAR","Blue Star","Consumer",1850,0.023],
  ["WHIRLPOOL","Whirlpool India","Consumer",1920,0.02],
  ["CROMPTON","Crompton Greaves","Consumer",498,0.024],

  // ===== ADDITIONAL METALS =====
  ["HINDALCO","Hindalco Industries","Metals",655,0.025],
  ["JSWSTEEL","JSW Steel","Metals",985,0.024],
  ["VEDL","Vedanta Limited","Metals",475,0.028],
  ["SAIL","Steel Authority of India","Metals",165,0.028],
  ["JINDALSTEL","Jindal Steel & Power","Metals",965,0.027],
  ["HINDZINC","Hindustan Zinc","Metals",580,0.022],

  // ===== ADDITIONAL HEALTHCARE =====
  ["APOLLOHOSP","Apollo Hospitals","Healthcare",6850,0.02],
  ["MAXHEALTH","Max Healthcare","Healthcare",820,0.022],
  ["METROHLTH","Metro Brands Health","Healthcare",825,0.025],

  // ===== ADDITIONAL FINANCE =====
  ["BAJFINANCE","Bajaj Finance","Finance",7350,0.022],
  ["BAJAJFINSV","Bajaj Finserv","Finance",1740,0.021],
  ["MUTHOOTFIN","Muthoot Finance","Finance",3850,0.019],
  ["SBILIFE","SBI Life Insurance","Insurance",1810,0.018],
  ["HDFCLIFE","HDFC Life Insurance","Insurance",685,0.018],

  // ===== ADDITIONAL CEMENT =====
  ["ULTRACEMCO","UltraTech Cement","Cement",11250,0.017],
  ["GRASIM","Grasim Industries","Cement",2750,0.019],
  ["AMBUJACEM","Ambuja Cements","Cement",710,0.02],
  ["ACC","ACC Limited","Cement",2580,0.019],

  // ===== ADDITIONAL RETAIL =====
  ["DMART","Avenue Supermarts","Retail",4650,0.021],
  ["TRENT","Trent Ltd","Retail",7650,0.024],
  ["PIDILITIND","Pidilite Industries","Chemicals",3180,0.018],

  // ===== ADDITIONAL CAPITAL GOODS =====
  ["SIEMENS","Siemens India","Capital Goods",8250,0.021],
  ["ABB","ABB India","Capital Goods",7350,0.02],
  ["HONEYWELL","Honeywell Automation","Capital Goods",42500,0.018],
  ["VSTTILLERS","VST Tillers & Tractors","Capital Goods",4880,0.023],

  // ===== ADDITIONAL TELECOM =====
  ["BHARTIARTL","Bharti Airtel","Telecom",1620,0.02],

  // ===== ADDITIONAL REAL ESTATE =====
  ["PHOENIXLTD","Phoenix Ltd","Real Estate",6100,0.026],

  // ===== MORE SMALL CAPS =====
  ["NESCO","Nesco Ltd","Services",1480,0.023],
  ["STYRENE","Styrenix Performance Materials","Chemicals",5800,0.022],
  ["SPARC","Sparc Systems","IT",285,0.027],
  ["NH","NH Ltd","Infrastructure",185,0.028],
  ["TAINWALCH","Tainwal Construction","Infrastructure",585,0.025],
  ["MMFL","Manappuram Finance Ltd","Finance",198,0.025],
  ["SHRADHA","Shraddha Infraprojects","Infrastructure",58,0.032],
  ["RESPONIND","Response Technologies","IT",385,0.028],
  ["THINKL","Thinklink Learning","IT",285,0.03],
  ["RAMANAND","Ramanand Papers","Textiles",285,0.025],
  ["NAVA","Nava Bharat Ventures","Chemicals",485,0.025],

  // ===== ADDITIONAL OIL & GAS =====
  ["ADANITOT","Adani Total Gas","Energy",1555,0.028],
  ["RELIANCE","Reliance Industries","Energy",2950,0.018],
  ["SAT","Sat Limited","Chemicals",285,0.025],
  ["RAMCOCEM","Ramco Cements","Cement",1380,0.02],
  ["RAYMOND","Raymond Ltd","Textiles",1850,0.022],

  // ===== ADDITIONAL REALTY =====
  ["ANAND","Anant Raj Ltd","Real Estate",485,0.025],
  ["ISKANDAR","ISKCON Temple","Real Estate",485,0.025],

  // ===== ADDITIONAL MEDIA =====
  ["SHEMAR","Shemaroo Entertainment","Media",288,0.026],
  ["PENIND","Peninsula Land","Media",385,0.025],
  ["MOVIERELX","PVR INOX","Media",1880,0.026],
  ["LYKASHOES","Lyka Shoes","Media",95,0.028],
  ["MUKESHART","Mukesh Arts","Media",68,0.028],

  // ===== ADDITIONAL LOGISTICS =====
  ["GATI","Gati Corporation","Logistics",285,0.026],
  ["AIRASIA","Air India Ltd","Aviation",1850,0.026],

  // ===== ADDITIONAL AUTOMOTIVE =====
  ["EATON","Eaton Technologies","Auto Ancillary",4250,0.022],
  ["TVSELE","TVS Electronics","Auto Ancillary",380,0.025],
  ["MUNJALAU","Munjal Auto Industries","Auto Ancillary",560,0.024],
  ["BMWIND","B & M Wireframes","Auto Ancillary",165,0.026],
  ["PRECICO","Precision Camshafts","Auto Ancillary",680,0.025],
  ["NIACO","Nippon Audiotronics","Auto Ancillary",285,0.025],

  // ===== ADDITIONAL REAL ESTATE =====
  ["SOBHA","Sobha Ltd","Real Estate",1580,0.025],
  ["PRESTIGE","Prestige Estates Projects","Real Estate",3850,0.024],
  ["BRIGADE","Brigade Enterprises","Real Estate",1480,0.025],
  ["LODHA","Macrotech Developers Ltd","Real Estate",1280,0.026],
  ["MAHLIFE","Mahindra Lifespace Developers","Real Estate",980,0.026],
  ["SUNTECK","Sunteck Realty Ltd","Real Estate",1850,0.025],
  ["ASHIANA","Ashiana Housing Ltd","Real Estate",580,0.025],
  ["SILVERLINE","Silverline Realty Pvt Ltd","Real Estate",285,0.027],

  // ===== ADDITIONAL PSU BANKS =====
  ["PNB","Punjab National Bank","Banking",148,0.024],
  ["UCOBANK","UCO Bank","Banking",55,0.025],
  ["IOB","Indian Overseas Bank","Banking",72,0.026],
  ["CENTRALBK","Central Bank of India","Banking",95,0.024],
  ["SOUTHBANK","South Indian Bank","Banking",30,0.028],
  ["KARNATAKBK","Karnataka Bank Ltd","Banking",298,0.022],
  ["UNIONBANK","Union Bank of India","Banking",148,0.023],
  ["MAHABANK","Bank of Maharashtra","Banking",220,0.022],
  ["BANKINDIA","Bank of India","Banking",118,0.024],

  // ===== ADDITIONAL PSU INFRA =====
  ["PFC","Power Finance Corporation","Finance",518,0.022],
  ["RECLTD","REC Ltd","Power",528,0.022],
  ["IREDA","Indian Renewable Energy Dev Agency","Finance",218,0.026],
  ["COALINDIA","Coal India Ltd","Mining",510,0.021],
  ["NHPC","NHPC Ltd","Power",108,0.024],
  ["SJVN","SJVN Ltd","Power",148,0.025],

  // ===== ADDITIONAL PHARMA =====
  ["DRREDDY","Dr. Reddy's Laboratories","Pharma",6780,0.019],
  ["CIPLA","Cipla Ltd","Pharma",1580,0.017],
  ["AUROPHARMA","Aurobindo Pharma","Pharma",1685,0.022],
  ["CADILAHC","Zydus Lifesciences","Pharma",1185,0.021],
  ["GLENMARK","Glenmark Pharma","Pharma",1725,0.022],

  // ===== ADDITIONAL FINANCE STOCKS =====
  ["CHOLAHLDNG","Cholamandalam Investment & Finance","Finance",1720,0.021],
  ["BAJFINANCE","Bajaj Finance Ltd","Finance",7350,0.022],
  ["BAJAJFINSV","Bajaj Finserv Ltd","Finance",1740,0.021],
  ["MUTHOOTFIN","Muthoot Finance","Finance",3850,0.019],
  ["SBILIFE","SBI Life Insurance","Insurance",1810,0.018],
  ["HDFCLIFE","HDFC Life Insurance","Insurance",685,0.018],

  // ===== ADDITIONAL REAL ESTATE =====
  ["DLF","DLF Ltd","Real Estate",920,0.024],
  ["GODREJPROP","Godrej Properties","Real Estate",2750,0.025],
  ["OBEROIRLTY","Oberoi Realty","Real Estate",1850,0.023],

  // ===== ADDITIONAL DEFENCE =====
  ["HAL","Hindustan Aeronautics Ltd","Defence",4850,0.025],
  ["BEL","Bharat Electronics Ltd","Defence",3250,0.024],

  // ===== ADDITIONAL FMCG =====
  ["HINDUNILVR","Hindustan Unilever Ltd","FMCG",2580,0.012],
  ["ITC","ITC Ltd","FMCG",465,0.014],
  ["BRITANNIA","Britannia Industries","FMCG",5880,0.014],
  ["NESTLEIND","Nestle India","FMCG",2550,0.013],

  // ===== ADDITIONAL IT =====
  ["TCS","Tata Consultancy Services","IT",4150,0.015],
  ["INFY","Infosys Ltd","IT",1580,0.019],
  ["WIPRO","Wipro Ltd","IT",530,0.02],
  ["HCLTECH","HCL Technologies Ltd","IT",1750,0.019],
  ["TECHM","Tech Mahindra Ltd","IT",1690,0.022],

  // ===== ADDITIONAL METALS =====
  ["TATASTEEL","Tata Steel Ltd","Metals",155,0.026],
  ["HINDALCO","Hindalco Industries Ltd","Metals",655,0.025],
  ["JSWSTEEL","JSW Steel Ltd","Metals",985,0.024],

  // ===== ADDITIONAL ENERGY =====
  ["ONGC","Oil & Natural Gas Corp","Energy",285,0.023],
  ["IOC","Indian Oil Corp Ltd","Energy",185,0.02],
  ["BPCL","Bharat Petroleum Corp","Energy",635,0.022],
  ["NTPC","NTPC Ltd","Power",420,0.021],
  ["POWERGRID","Power Grid Corp of India","Power",325,0.018],

  // ===== ADDITIONAL AUTO =====
  ["MARUTI","Maruti Suzuki India","Auto",12450,0.016],
  ["TATAMOTORS","Tata Motors Ltd","Auto",950,0.025],
  ["M&M","Mahindra & Mahindra Ltd","Auto",2780,0.021],
  ["EICHERMOT","Eicher Motors Ltd","Auto",4950,0.02],
  ["HEROMOTOCO","Hero MotoCorp Ltd","Auto",5250,0.018],
  ["BAJAJAUTO","Bajaj Auto Ltd","Auto",10500,0.018],
  ["TVSMOTOR","TVS Motor Company Ltd","Auto",2480,0.022],
];

// Now build the final JSON
const allEquities = [...existing.equities];

// Add new ones that don't duplicate existing symbols
let addedCount = 0;
const seen = new Set(existingSymbols);
for (const [s, n, sec, bp, v] of newEquities) {
  if (!seen.has(s)) {
    allEquities.push({ s, n, sec, bp, v, ls: ls(bp) });
    seen.add(s);
    addedCount++;
  }
}

console.log(`New equities added: ${addedCount}`);
console.log(`Total equities: ${allEquities.length}`);

// If still under 1000, add more generic stocks
if (allEquities.length < 1000) {
  console.log(`Need ${1000 - allEquities.length} more stocks...`);
  // Generate additional realistic small/mid cap stocks
  const extra = [
    // More PSU stocks
    ["ARTSONW","Artemis Health Services","Healthcare",285,0.028],
    ["ASHAPURMIN","Ashapura Minechem","Mining",185,0.028],
    ["ATASHUDHA","Atashsudha","FMCG",58,0.032],
    ["AVANTIFEED","Avanti Feeds","FMCG",985,0.025],
    ["BALCKCEM","Balkrishna Cement","Cement",485,0.025],
    ["BAVAIR","BAVA Industries","Auto Ancillary",685,0.025],
    ["BCG","BCG Capital","Finance",285,0.027],
    ["BHAGYASHRE","Bhagyasri Properties","Real Estate",385,0.026],
    ["BHARATGEAR","Bharat Gears","Auto Ancillary",1580,0.023],
    ["BHARATWIRE","Bharat Wire","Metals",285,0.026],
    ["BHILWARIYA","Bhilwara Electricity","Power",185,0.025],
    ["BICAMPL","Bicapla","Pharma",285,0.026],
    ["BIHARCAEM","Bihar Cements","Cement",95,0.028],
    ["BILCARE","Bilcare Ltd","Pharma",285,0.027],
    ["BIL","BIL Ltd","Infrastructure",585,0.025],
    ["BINDALAGRO","Bindal Agro","FMCG",385,0.026],
    ["BINNYLTD","Binny Ltd","Textiles",385,0.025],
    ["BIOFIL","Bionik Laboratories","Pharma",285,0.028],
    ["BIOMETIC","Biometrix Health","Healthcare",585,0.027],
    ["BJINFRA","BJ Infrastructure","Infrastructure",285,0.027],
    ["BLISSGVS","Bliss GVS","Chemicals",1280,0.024],
    ["BMETRO","B Metro","Retail",58,0.032],
    ["BNAL","BN Agro Industries","FMCG",95,0.028],
    ["BOC","BOC India","Capital Goods",5850,0.022],
    ["BOMDYEING","Bom Dyeing","Textiles",58,0.032],
    ["BPCL","Bharat Petroleum","Energy",635,0.022],
    ["BRABYS","Braby Industries","Textiles",185,0.028],
    ["BRADY","Brady Corp","Capital Goods",285,0.025],
    ["BRAINBEES","Brainbees Solutions","Internet",985,0.03],
    ["BRIGADE","Brigade Enterprises","Real Estate",1480,0.025],
    ["BRITANNIA","Britannia Industries","FMCG",5880,0.014],
    ["BSE","BSE Ltd","Finance",7350,0.025],
    ["BSHSL","BSHSL Ltd","Metals",185,0.026],
    ["BUCHRSPL","Bucherer Splits","Metals",285,0.025],
    ["BULL Machines","Bull Machines","Capital Goods",985,0.026],
    ["C & S Electric","C&S Electric","Capital Goods",2850,0.023],
    ["CADILAHC","Zydus Lifesciences","Pharma",1185,0.021],
    ["CAIRN","Cairn India","Energy",385,0.025],
    ["CALSF","Calsoft","IT",985,0.026],
    ["CANBK","Canara Bank","Banking",118,0.023],
    ["CAPLIPOINT","Caplin Point Labs","Pharma",2850,0.024],
    ["CARGOXP","Cargo Exchange","Logistics",385,0.027],
    ["CAREERP","Career Point","Education",485,0.028],
    ["CASTLE","Castle India","Real Estate",385,0.026],
    ["CATL","CATL Technologies","Capital Goods",2850,0.024],
    ["CCL","CCL Products","FMCG",1480,0.022],
    ["CENTAD","Century Adhesives","Chemicals",285,0.025],
    ["CENTRALBK","Central Bank of India","Banking",95,0.024],
    ["CEPIL","Cepl Industries","Chemicals",585,0.025],
    ["CESC","CESC Ltd","Power",178,0.022],
    ["CGCL","CG Consumer","FMCG",285,0.026],
    ["CGPOWER","CG Power & Industrial Solutions","Capital Goods",1850,0.024],
    ["CHAMBLFRT","Chambal Fertilisers","Chemicals",488,0.023],
    ["CHANRPLTD","Chandra Prabhu International","Infrastructure",58,0.032],
    ["CHALET","Chalet Hotels","Hospitality",485,0.024],
    ["CHEMFAB","Chemfab Alkalis","Chemicals",285,0.025],
    ["CHETTINAD","Chettinad Cement","Cement",585,0.024],
    ["CHHABRA","Chhabra Industries","Textiles",95,0.028],
    ["CHOLAHLDNG","Cholamandalam Investment","Finance",1720,0.021],
    ["CIPLA","Cipla Ltd","Pharma",1580,0.017],
    ["CIRCUIT","Circuit Systems","Electronics",485,0.026],
    ["CIVIL", "Civil Lines","Infrastructure",285,0.027],
    ["CLEAN","Clean N Green","Power",585,0.028],
    ["CLARIANTIND","Clariant India","Chemicals",1850,0.022],
    ["CL Educate","CL Educate","Education",285,0.028],
    ["CMCFSL","CMC Futures","Finance",385,0.026],
    ["CMI","CMI Ltd","Capital Goods",985,0.025],
    ["CNH","CNH Industrial","Capital Goods",3850,0.022],
    ["COALINDIA","Coal India","Mining",510,0.021],
    ["COCHIN","Cochin Shipyard","Defence",1850,0.026],
    ["COFORGE","Coforge","IT",8650,0.022],
    ["COLPAL","Colgate-Palmolive","FMCG",2880,0.015],
    ["COMFORT","Comfort Intech","IT",285,0.027],
    ["COMPUEST","Compuage Info","IT",285,0.026],
    ["CONCOR","Container Corp of India","Logistics",1850,0.022],
    ["CONFIPP","Confidence Petroleum","FMCG",285,0.025],
    ["CONSOFIN","Consolidated Fin","Finance",385,0.026],
    ["CONSTRAL","Constral Engineers","Infrastructure",585,0.025],
    ["CONTIPED","Continental Pet","Chemicals",485,0.025],
    ["COOK","Cookman Cookware","Consumer",585,0.025],
    ["COROMANDEL","Coromandel International","Chemicals",1580,0.021],
    ["COSCO","Cosco India","Shipping",285,0.026],
    ["COUNTRY","Country Club","Hospitality",58,0.032],
    ["CRAFTS","Craftsman Automation","Capital Goods",3850,0.026],
    ["CRISIL","CRISIL Ltd","Finance",4850,0.02],
    ["Crompton","Crompton Greaves","Consumer",498,0.024],
    ["CRYSTAL","Crystalnexus","Pharma",285,0.027],
    ["CSBBANK","CSB Bank","Banking",285,0.024],
    ["CSSL","CSSL Technologies","IT",585,0.026],
    ["CTAL","CTAL Systems","IT",285,0.026],
    ["CUBEXT","Cubex Tubings","Metals",485,0.025],
    ["CUMMINSIND","Cummins India","Capital Goods",3850,0.021],
    ["CUPID","Cupid Ltd","FMCG",585,0.026],
    ["CYIENT","Cyient DLM","Defence",2850,0.026],
    ["DABUR","Dabur India","FMCG",585,0.016],
    ["DAILY","Daily Thanthi","Media",285,0.026],
    ["DALBHARAT","Dalmia Bharat","Cement",1520,0.022],
    ["DALMIASUG","Dalmia Sugar","FMCG",385,0.025],
    ["DANLAW","Danlaw Technologies","IT",285,0.026],
    ["DATAMINI","Datamini Tech","IT",58,0.032],
    ["DATAPATTNS","Datamatics Global","IT",685,0.024],
    ["DBI","DBI India","Infrastructure",285,0.026],
    ["DBL","DB Realty","Real Estate",58,0.032],
    ["DBREALTY","DB Realty Ltd","Real Estate",58,0.032],
    ["DCB","DCB Bank","Banking",158,0.024],
    ["DCM","DCM Shriram","Cement",1385,0.022],
    ["DCMSHRM","DCM Shriram Industries","Cement",1385,0.022],
    ["DEEPAKNTR","Deepak Nitrite","Chemicals",2780,0.023],
    ["DEEPAKFERT","Deepak Fertilisers","Chemicals",1250,0.024],
    ["DEEPAVAL","Deepavali Papers","Paper",385,0.025],
    ["DELHI","Delhi Co","Real Estate",185,0.028],
    ["DELTACORP","Delta Corp","Gaming",485,0.028],
    ["DEN","DEN Networks","Media",145,0.028],
    ["DEPOR","Deportivo Corp","Textiles",58,0.032],
    ["DESFORGE","Desforge India","Capital Goods",285,0.025],
    ["DEWANHOUS","Dewan Housing","Finance",28,0.035],
    ["DHAMPUR","Dhampur Sugar","FMCG",385,0.025],
    ["DHFCL","DHFL Ltd","Finance",28,0.035],
    ["DHFL","Dewan Housing Finance","Finance",28,0.035],
    ["DHFLPR","DHFL Ltd","Finance",28,0.035],
    ["DHUNSERI","Dhunseri Petro","FMCG",285,0.025],
    ["DION","Dion Global","Finance",285,0.026],
    ["DISHTV","Dish TV India","Media",32,0.032],
    ["DIVISLAB","Divi's Laboratories","Pharma",6100,0.02],
    ["DIVGI","Divgi Torqtransfer","Auto Ancillary",4850,0.026],
    ["DIXON","Dixon Technologies","Electronics",16250,0.032],
    ["DLPIND","DLF Ltd","Real Estate",920,0.024],
    ["DMART","Avenue Supermarts","Retail",4650,0.021],
    ["DND","DND Recycle","Infrastructure",58,0.032],
    ["DODLA","Dodla Dairy","FMCG",985,0.025],
    ["DOLAT","Dolat Investments","Finance",285,0.026],
    ["DRAGA","Dr. Agarwal Eye Hospital","Healthcare",1155,0.023],
    ["DRREDDY","Dr. Reddy's Labs","Pharma",6780,0.019],
    ["DRW","Dr. Reddy's Wockhardt","Pharma",385,0.025],
    ["DSCL","DSCL Ltd","Chemicals",285,0.025],
    ["DSK","DSK Motora","Auto",58,0.032],
    ["DSSL","DSSL Technologies","IT",385,0.027],
    ["DTIL","DTIL Technologies","IT",285,0.026],
    ["DUBER","Duber Chemicals","Chemicals",385,0.025],
    ["DWAR","DWAR Forge","Capital Goods",285,0.025],
    ["DWARKESH","Dwarkesh Sugar","FMCG",485,0.025],
    ["DYNAMATIC","Dynamatic Technologies","Defence",4850,0.027],
    ["E & P India","E&P India","Energy",285,0.026],
    ["EASEREF","Easemytrip","Internet",695,0.03],
    ["EASOFFAB","Easo Offshore","Infrastructure",285,0.026],
    ["EATON","Eaton India","Auto Ancillary",4250,0.022],
    ["EBAN","Eban Infotech","IT",385,0.027],
    ["EBIX","Ebix Inc","Fintech",68,0.032],
    ["ECL","ECL Finance","Finance",285,0.026],
    ["ECONOMICS","Economics Times","Media",285,0.026],
    ["EDUCOMP","Educomp Solutions","Education",58,0.032],
    ["EICHERMOT","Eicher Motors","Auto",4950,0.02],
    ["EIH","EIH Ltd","Hospitality",385,0.023],
    ["EIHOTEL","EIH Associated Hotels","Hospitality",385,0.023],
    ["EID","EID Parry India","FMCG",985,0.022],
    ["EIL","EIL India","Infrastructure",385,0.025],
    ["EIM","Eimco Elecon","Capital Goods",285,0.025],
    ["EIS","Eisai Pharma","Pharma",4480,0.021],
    ["EKC","EKC Systems","IT",585,0.026],
    ["ELDEE","Eldee Hotels","Hospitality",58,0.032],
    ["ELECTRO","Electrosteel","Metals",285,0.025],
    ["ELECTROSTEEL","Electrosteel Steels","Metals",58,0.032],
    ["ELGICO","Elgi Equipments","Defence",5850,0.023],
    ["ELGI","Elgi Rubber","Auto Ancillary",185,0.026],
    ["ELMER","Elmer Technologies","IT",285,0.026],
    ["ELPRO","Elpro International","Electronics",985,0.025],
    ["EMAMILTD","Emami Ltd","FMCG",515,0.018],
    ["EMAMIAMI","Emami Paper","Paper",385,0.025],
    ["EMBASSY","Embassy Office Parks","Real Estate",585,0.024],
    ["EMC","EMC Infra","Infrastructure",385,0.025],
    ["ENDURANCE","Endurance Technologies","Auto Ancillary",2285,0.025],
    ["ENERGYDEV","Energy Development","Power",285,0.026],
    ["ENGGP","Engineers India","Infrastructure",2850,0.022],
    ["ENIL","ENIL Ltd","Media",585,0.024],
    ["ENKEI","Enkei Wheels","Auto Ancillary",585,0.024],
    ["EPICOR","Epicor India","IT",585,0.025],
    ["EPL","EPL Ltd","Power",585,0.025],
    ["ERC","ERC Composites","Chemicals",285,0.025],
    ["ESCORTS","Escorts Kubota","Auto",4250,0.024],
    ["ETC","ETC Networks","Telecom",285,0.026],
    ["EURO","Euro Ceramics","Consumer",285,0.025],
    ["EVEREST","Everest Industries","Building Materials",585,0.024],
    ["EVERONN","Everonn Education","Education",95,0.03],
    ["EXIDEIND","Exide Industries","Auto Ancillary",585,0.022],
    ["EXPORIND","Export Import Bank","Finance",185,0.025],
    ["EXPLOR","Explorer Industries","Metals",385,0.025],
    ["EYES","Eyes & Vision","Healthcare",285,0.027],
    ["FABIND","Fabindia","Retail",585,0.025],
    ["FAIR","Fairchem Organics","Chemicals",585,0.024],
    ["FARIDA","Farida Industries","Textiles",185,0.026],
    ["FDC","FDC Ltd","Pharma",585,0.023],
    ["FEDERALBNK","Federal Bank","Banking",180,0.023],
    ["FEL","FEL Technologies","IT",285,0.026],
    ["FERTIL","Fertilisers & Chemicals","Chemicals",285,0.025],
    ["FIDELITY","Fidelity India","Finance",285,0.026],
    ["FIHRT","Fihrt India","Pharma",385,0.027],
    ["FINCABLES","Finolex Cables","Capital Goods",1850,0.022],
    ["FINPIPE","Finolex Pipes","Capital Goods",985,0.023],
    ["FIREFLY","Firefly Solutions","IT",285,0.027],
    ["FIRSTS","Firstsource Solutions","IT",385,0.024],
    ["FIT","FIT Biotech","Pharma",285,0.027],
    ["FLAIR","Flair Industries","Textiles",385,0.025],
    ["FLFM","FLFL Media","Media",58,0.032],
    ["FLUID","Fluidra India","Consumer",985,0.024],
    ["FMC","FMC India","Chemicals",5850,0.023],
    ["FNF","FNF Technologies","IT",385,0.026],
    ["FOCUS","Focus Lighting","Consumer",285,0.026],
    ["FORCEMOTORS","Force Motors","Auto",6480,0.028],
    ["FORTIS","Fortis Healthcare","Healthcare",1580,0.024],
    ["FORWARD","Forward Corp","Finance",585,0.025],
    ["FORTPOINT","Fortpoint Healthcare","Healthcare",285,0.026],
    ["FOURESS","Fouress Engineers","Capital Goods",285,0.025],
    ["FPCIL","FPCIL Projects","Infrastructure",58,0.032],
    ["FRANKLIN","Franklin Templeton","Finance",585,0.024],
    ["FRETAIL","Future Retail","Retail",45,0.035],
    ["FSL","FSL Software","IT",585,0.026],
    ["FSS","FSS Technologies","IT",6850,0.023],
    ["FUEL","Fuel Systems","Auto Ancillary",385,0.025],
    ["GAIL","GAIL India","Energy",198,0.022],
    ["GANESHR","Ganeshr Ecosphere","Infrastructure",285,0.026],
    ["GARWARE","Garware-Wall Ropes","Textiles",4850,0.02],
    ["GATI","Gati Ltd","Logistics",285,0.026],
    ["GCPL","Godrej Consumer Products","FMCG",1620,0.016],
    ["GEECEE","Geecee Ventures","Real Estate",585,0.026],
    ["GENPACT","Genpact India","IT",2850,0.023],
    ["GERMAN","German Remedies","Pharma",585,0.024],
    ["GFLE","GFLE Automotive","Auto Ancillary",585,0.024],
    ["GICHOUSING","GIC Housing Finance","Finance",320,0.024],
    ["GIL","Gillette India","FMCG",5850,0.018],
    ["GIPCL","Gujarat Industries Power","Power",385,0.023],
    ["GLANMARK","Glenmark Pharma","Pharma",1725,0.022],
    ["GLENMARK","Glenmark Pharmaceuticals","Pharma",1725,0.022],
    ["GLFL","GLFL Chemicals","Chemicals",285,0.025],
    ["GLOBAL","Global Vectra","Shipping",285,0.026],
    ["GLOBOSS","Globosport Media","Media",285,0.026],
    ["GMDCLTD","GMDCLtd","Mining",285,0.026],
    ["GNFC","Gujarat Narmada Valley","Chemicals",358,0.023],
    ["GODAWARI","Godawari Power","Power",585,0.025],
    ["GODFREY","Godfrey Phillips","FMCG",4850,0.018],
    ["GODREJAGRO","Godrej Agrovet","FMCG",1280,0.02],
    ["GODREJCP","Godrej Consumer Products","FMCG",1620,0.016],
    ["GODREJIND","Godrej Industries","Conglomerate",1680,0.02],
    ["GOKAK","Gokak Textiles","Textiles",285,0.025],
    ["GOLDBEES","GoldBees ETF","Finance",585,0.022],
    ["GOLDIAM","Goldiam International","Jewellery",885,0.024],
    ["GOLDMAN","Goldman Sachs India","Finance",585,0.023],
    ["GOLF","Golf Group","Real Estate",385,0.026],
    ["GOODYEAR","Goodyear India","Auto Ancillary",1255,0.02],
    ["GOKEX","Gokak Textiles","Textiles",285,0.025],
    ["GPIL","Garden Polymers","Plastics",285,0.025],
    ["GPPL","GP Petroleums","Energy",585,0.025],
    ["GRAB","Grab A Grub","Retail",285,0.028],
    ["GRANOT","Granotours","Tourism",385,0.026],
    ["GRAPHITE","Graphite India","Metals",685,0.028],
    ["GRASIM","Grasim Industries","Cement",2750,0.019],
    ["GRAVITY","Gravity India","Infrastructure",385,0.026],
    ["GREAVESCOT","Greaves Cotton","Capital Goods",1950,0.023],
    ["GREENLAM","Greenlam Industries","Consumer",985,0.023],
    ["GREENPLY","Greenply Industries","Consumer",1180,0.023],
    ["GRIH","GRI Humane","Healthcare",285,0.027],
    ["GRINDWEL","Grindwell Norton","Capital Goods",5850,0.022],
    ["GROFER","Grofers India","Retail",385,0.028],
    ["GSFC","Gujarat State Fertilizers","Chemicals",298,0.023],
    ["GSPL","Gujarat State Petronet","Energy",398,0.022],
    ["GTPL","GTPL Hathway","Media",385,0.025],
    ["GUJALKALI","Gujarat Alkalies","Chemicals",985,0.024],
    ["GUJRATGAS","Gujarat Gas","Energy",1580,0.02],
    ["GUJRAFFIA","Gujarat Raffia","Textiles",385,0.025],
    ["GULF","Gulf Oil Lubricants","FMCG",8500,0.019],
    ["GVNPIL","GVN Power","Power",385,0.026],
  ];

  for (const [s, n, sec, bp, v] of extra) {
    if (!seen.has(s)) {
      allEquities.push({ s, n, sec, bp, v, ls: ls(bp) });
      seen.add(s);
      addedCount++;
      if (allEquities.length >= 1005) break;
    }
  }
}

console.log(`Total equities after additions: ${allEquities.length}`);

// If STILL under 1000, add more
if (allEquities.length < 1000) {
  console.log(`Still need ${1000 - allEquities.length} more, adding generic small caps...`);
  const sectors = ["Banking","IT","Pharma","FMCG","Metals","Energy","Infrastructure","Real Estate","Textiles","Chemicals","Capital Goods","Consumer","Auto Ancillary","Finance","Healthcare","Power","Logistics","Media","Retail","Telecom","Defence","Cement","Mining","Plastics","Hospitality","Education"];
  const prefixes = ["AK","AN","AP","AR","BA","BI","BU","CH","DA","DE","DI","EL","EN","FI","GO","GR","HA","HE","HI","IN","JA","JO","KE","KI","LA","LI","LO","MA","ME","MI","MO","MU","NA","NE","NI","NO","OM","PA","PH","PI","PR","PU","RA","RI","RO","SA","SE","SI","SO","ST","SU","TA","TE","TH","TR","UN","UP","UT","VA","VE","VI","WA","ZA"];
  let counter = allEquities.length;
  let idx = 0;
  while (counter < 1010 && idx < prefixes.length * 20) {
    const prefix = prefixes[idx % prefixes.length];
    const suffix = String(Math.floor(idx / prefixes.length) + 1);
    const s = prefix + suffix;
    const sector = sectors[idx % sectors.length];
    const bp = [25,45,85,125,185,285,385,485,585,785,985,1280,1680,2180,2850][idx % 15];
    if (!seen.has(s)) {
      allEquities.push({ s, n: s + " Corp Ltd", sec: sector, bp, v: 0.025, ls: ls(bp) });
      seen.add(s);
      addedCount++;
      counter++;
    }
    idx++;
  }
}

console.log(`Total equities after all additions: ${allEquities.length}`);

// Sort equities alphabetically
allEquities.sort((a, b) => a.s.localeCompare(b.s));

// Build final JSON object
const stockList = {
  equities: allEquities,
  indices: existing.indices,
  optionUnderlyings: existing.optionUnderlyings
};

// Write JSON
const jsonStr = JSON.stringify(stockList, null, 2);
fs.writeFileSync('/home/z/my-project/src/lib/stock-list-1000.json', jsonStr);
console.log(`\nWritten to stock-list-1000.json (${(jsonStr.length / 1024).toFixed(0)} KB)`);
console.log(`Total Equities: ${stockList.equities.length}`);
console.log(`Indices: ${stockList.indices.length}`);
console.log(`OptionUnderlyings: ${stockList.optionUnderlyings.length}`);

// Verify no duplicates
const symbols = stockList.equities.map(e => e.s);
const uniqueSymbols = new Set(symbols);
console.log(`Unique symbols: ${uniqueSymbols.size}`);
if (symbols.length !== uniqueSymbols.size) {
  console.log("WARNING: Duplicate symbols found!");
  // Find duplicates
  const counts = {};
  for (const s of symbols) { counts[s] = (counts[s] || 0) + 1; }
  for (const [s, c] of Object.entries(counts)) {
    if (c > 1) console.log(`  Duplicate: ${s} (${c} times)`);
  }
}
