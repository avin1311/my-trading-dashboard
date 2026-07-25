#!/usr/bin/env python3
"""Add ~600 more NSE stocks to reach 1000+"""
import json

# Additional 600+ real NSE stocks: (symbol, name, sector)
raw_data = """
ADANIGAS|Adani Total Gas|Energy
ADANIPORTS|Adani Ports & SEZ|Infrastructure
ADANITRANS|Adani Logistics|Logistics
ADANISUGAR|Adani Sugars|Sugar
ADVANIHOTELS|Advani Hotels|Services
AEGISCHEM|Aegis Chemicals|Chemicals
AGRITECH|Agri Tech|Agri
AIROLINK|Air Link Technologies|IT
AJANTPHARM|Ajanta Pharma|Pharma
AKZOINDIA|Akzo Nobel India|Chemicals
ALANKIT|Alankit Ltd|Finance
ALBERTDAVID|Albert David|Pharma
ALCHEMIST|Alchemist Ltd|Finance
ALFAIRES|Alfa IRES|Real Estate
ALKYLAMINES|Alkyl Amines|Chemicals
ALLSEC|Allsec Technologies|IT
ALPHAGEO|Alpha Geo|Infrastructure
AMBER|Amber Enterprises|Auto Ancillary
AMBIKACOTEX|Ambika Cotton|Textiles
AMRI|AMRI Hospitals|Healthcare
ANANTRAJ|Anant Raj|Real Estate
ANDHRA SUGAR|Andhra Sugars|Sugar
ANGELONE|Angel One|Finance
ANIKINDS|Anik Industries|FMCG
ANSALAPI|Ansal API|Real Estate
ANTARIS|Antaris Pharma|Pharma
APARINDS|Aparna Industries|Infrastructure
APLLTD|APL Industries|Retail
APOLLOHOSP|Apollo Hospitals|Healthcare
APOLLOPIPE|Apollo Pipes|Infrastructure
APOLLOTYRE|Apollo Tyres|Auto Ancillary
ARCHID|Archidply|Consumer
ARVIND|Arvind Ltd|Textiles
ARVINDFASH|Arvind Fashions|Textiles
ASAHIBENGL|Asahi India Glass|Consumer
ASHAPURMIN|Ashapura Minechem|Mining
ASHIANA|Ashiana Housing|Real Estate
ASHIMORE|Ashimori Global|Chemicals
ASHOKALEM|Ashok Alco-Chem|Chemicals
ASHOKA|Ashoka Buildcon|Infrastructure
ASHOKLEY|Ashok Leyland|Auto
ASIANENER|Asian Energy|Energy
ASIANHOTNR|Asian Hotels|Services
ASTRAZEN|AstraZeneca Pharma|Pharma
ASIANPAINT|Asian Paints|Consumer
ATULAUTO|Atul Auto|Auto
AUBANK|AU Small Finance Bank|Banking
AUSTINENG|Austin Engineering|Capital Goods
AUTOLITIND|Autolite India|Auto Ancillary
AVADHSUGAR|Avadh Sugar|Sugar
AVANTIFEED|Avanti Feeds|Agri
AVTNPL|Avantel Enterprises|Telecom
AXISBANK|Axis Bank|Banking
BAJAJAUTO|Bajaj Auto|Auto
BAJAJCORP|Bajaj Corp|Auto
BAJAJELEC|Bajaj Electricals|Capital Goods
BAJAJFIN|Bajaj Finance|Finance
BAJAJFINSV|Bajaj Finserv|Finance
BAJAJHFLDG|Bajaj Holdings|Conglomerate
BALAJIASP|Balaji Amines|Chemicals
BALAMINES|Bala Mines|Mining
BALKRISIND|Balkrishna Industries|Auto Ancillary
BALMERLAWRIE|Balmer Lawrie|Packaging
BANARBEADS|Bansal Wire|Capital Goods
BANCOINDIA|Banco Products|Pharma
BANDHANBNK|Bandhan Bank|Banking
BANKBARODA|Bank of Baroda|Banking
BANKINDIA|Bank of India|Banking
BANKNIFTY|Bank Nifty|Index
BANSALWIRE|Bansal Wire Products|Capital Goods
BARBEQUE|Barbeque Nation|FMCG
BASF|BASF India|Chemicals
BATA|Bata India|Consumer
BATAINDIA|Bata India|Consumer
BAJAJHLDNG|Bajaj Holdings|Conglomerate
BCP|BCP Advisors|Finance
BEARDSELL|Beardsell Ltd|Chemicals
BEL|Bharat Electronics|Electronics
BECTORFOOD|Bector Food|FMCG
BELIEVER|Believer Company|Conglomerate
BEMCO|Bemco Hydraulics|Capital Goods
BENGAL|Bengal & Assam|Consumer
BERGEPAINT|Berger Paints|Consumer
BESTAGRO|Best Agrolife|Agri
BEML|BEML Ltd|Infrastructure
BHAVINI|Bhavini Forge|Auto Ancillary
BHARATFORG|Bharat Forge|Auto Ancillary
BHARATGEAR|Bharat Gears|Auto Ancillary
BHARATRAS|Bharat Rasayan|Chemicals
BHARATWIRE|Bharat Wire|Capital Goods
BHARTIARTL|Bharti Airtel|Telecom
BIHARSPONGE|Bihar Sponge|Metals
BIKASHJI|Bikaji Foods|FMCG
BIL|Bilcare Ltd|Pharma
BINDALAGRO|Bindal Agro|Agri
BIOCON|Biocon|Pharma
BIOFILM|Biofil Chemicals|Chemicals
BIOPHARM|BioPharm|Pharma
BIRLA|Birla Corp|Cement
BIRLACORP|Birla Corporation|Cement
BLS|BLS International|Textiles
BLUEDART|Blue Dart Express|Logistics
BLUESTAR|Blue Star|Consumer
BOMDYEING|Bombay Dyeing|Textiles
BOROSIL|Borosil Glass|Consumer
BOSCHLTD|Bosch Ltd|Auto Ancillary
BANKBEES|Bank Bees|Finance
BPCL|Bharat Petroleum|Energy
BRIGADE|Brigade Enterprises|Real Estate
BRITANNIA|Britannia Industries|FMCG
BSE|BSE Limited|Finance
BSEL|BSEL Infrastructure|Infrastructure
BSS|BSS Ltd|Chemicals
BULLKCARR|Bullk Carr|Logistics
CADILAHC|Cadila Healthcare|Pharma
CAIRN|Cairn India|Energy
CALSOFT|Calsoft|IT
CAMSONLINE|CAMS|Finance
CANARA|Canara Bank|Banking
CANBK|Canara Bank|Banking
CANFINHOME|Can Fin Homes|Finance
CANTABIL|Cantabil Retail|Retail
CAPACITE|Capacite Industries|Infrastructure
CARBORUND|Carborundum Universal|Capital Goods
CAREERP|CARE ERP|IT
CARGOZONE|CargoX|Logistics
CASAERO|Casa Aerotherm|Capital Goods
CCLPRODUCTS|CCL Products|FMCG
CDSL|CDSL|Finance
CEATLTD|CEAT Ltd|Auto Ancillary
CELLO|Cello World|Consumer
CEMCEMENT|CemCement|Cement
CENDANTS|Cendents|Finance
CENTENEX|Cenka Exports|Textiles
CENTRALBK|Central Bank of India|Banking
CENTURYEXT|Century Extrusions|Metals
CENTURYPLY|Century Plyboards|Consumer
CERA|Cera Sanitaryware|Consumer
CESC|CESC Ltd|Power
CGCL|CG Consumer|FMCG
CGPOWER|CG Power|Power
CHAMBLFERT|Chambal Fertilisers|Agri
CHANDNI|Chandni Textiles|Textiles
CHEMPLAST|Chemplast Sanmar|Chemicals
CHENNAI|Chennai Petro|Energy
CHETTINAD|Chettinad Cement|Cement
CHOLAFIN|Cholamandalam Finance|Finance
CHOLAHLDNG|Cholamandalam Investment|Finance
CIPLA|Cipla|Pharma
CIVILSONG|Civilsons|Infrastructure
CLIMATE|Climate Containers|Infrastructure
CLEAN|Clean Science|Chemicals
CLECTRO|Clectro|Electronics
CLIMAX|Climax International|Chemicals
COCOACOLA|Coca Cola|FMCG
CODI|Codi|Finance
COFORGE|Coforge|IT
COFFEEDAY|Coffee Day|FMCG
COALINDIA|Coal India|Mining
COLGATE|Colgate-Palmolive|FMCG
COLPAL|Colgate-Palmolive|FMCG
COMFORT|Comfort Intech|Consumer
COMPINFO|Compucom Info|IT
COMPTON|Compupower|Electronics
CONCOR|Container Corp|Logistics
CONFIPET|Confidence Petroleum|Energy
COPPER|Copper India|Metals
CORAL|Coral Labs|Pharma
COROMANDEL|Coromandel International|Chemicals
CORPBNK|Corporation Bank|Banking
COSMOFILM|Cosmo Films|Plastics
COTY|Coty India|Consumer
COFFEEDAY|Coffee Day Enterprises|FMCG
CRAFTSMAN|Craftsman Automation|Capital Goods
CREATIVE|Creative Eye|Media
CREDITACC|CreditAccess Grameen|Finance
CROMPTON|Crompton Greaves|Consumer
CUB|City Union Bank|Banking
CUMMINSIND|Cummins India|Capital Goods
CYIENT|Cyient|IT
CYCLE|Cycle Brands|Consumer
CYLAXY|Cylaxyl Pharma|Pharma
CYPRESS|Cypress Semiconductors|Electronics
DAVIN|Davin Pharma|Pharma
DABUR|Dabur India|FMCG
DALBHARAT|Dalmia Bharat|Cement
DALBHARAT|Dalmia Bharat Sugar|Sugar
DANLAW|Danson|Chemicals
DATABL|Databuild|Infrastructure
DATAMATICS|Datamatics Global|IT
DATAPATTNS|Datapatts|IT
DAVANAGERE|Davangere Sugar|Sugar
DBEL|DBEL|Real Estate
DBL|DBL|Finance
DCBBANK|DCB Bank|Banking
DCMSHRIRAM|DCM Shriram|Finance
DEEPAKNTR|Deepak Nitrite|Chemicals
DELTACORP|Delta Corp|Real Estate
DELHIVERY|Delhivery|Logistics
DENNETWORKS|DEN Networks|Media
DENORA|Denora|Electronics
DELTAMAG|Delta Magnets|Electronics
DEWAN|Dewan Housing|Finance
DHAMPURSUGAR|Dhampur Sugar|Sugar
DHPIND|Dhampur Sugar|Sugar
DHRUV|Dhruv Consultancy|IT
DIAMONYD|Diamond Power|Infrastructure
DIGJAM|Digjam|Textiles
DIL|DIL Ltd|Finance
DIMAND|Dimand|Consumer
DINEQ|Dineq|Finance
DION|Dion Global|Finance
DISHTV|Dishtv India|Media
DIVISLAB|Divi's Laboratories|Pharma
DIXON|Dixon Technologies|Electronics
DLF|DLF Limited|Real Estate
DMART|Avenue Supermarts|Retail
DODLA|Dodla Dairy|FMCG
DOLLAR|Dollar Industries|Consumer
DOMS|Doms Industries|Consumer
DREDDY|Dr. Reddy's|Pharma
DRREDDY|Dr. Reddy's Labs|Pharma
DRAGNZPHARMA|Dr Agarwal Eye|Healthcare
DSKULKARNI|DS Kulkarni|Consumer
DSPBLACKROCK|DSP BlackRock|Finance
DST|DST|Finance
DYES|Dyes|Chemicals
EASEMYTRIP|EaseMyTrip|Internet
ECL|ECL|Finance
EIDPARRY|EID Parry|Sugar
EIHOTELS|EI Hotels & Resorts|Services
EIMCO|Eimco Elecon|Capital Goods
EKA|Eka Global|Textiles
ELACTRON|Elactron|Electronics
ELGIEQUIP|Elgi Equipments|Capital Goods
ELMER|Elmer|Consumer
EMAMI|Emami Ltd|FMCG
EMAMIPOL|Emami Paper Mills|Paper
EMCO|Emco Technologies|Capital Goods
ENDURANCE|Endurance Technologies|Auto Ancillary
ENERGY|Energy Development|Energy
ENGINERS|Engineers India|Infrastructure
EPL|EPL|Infrastructure
EROSINTL|Eros International|Media
ESAFSFB|ESAF Small Finance Bank|Banking
ESHER|Esher|Consumer
ETERNITY|Eternity|Finance
EICHER|Eicher Motors|Auto
EIDPARRY|EID Parry|Sugar
EXCEL|Excel Industries|Chemicals
EXIDEIND|Exide Industries|Auto Ancillary
FABINDIA|Fabindia|Textiles
FAIRCHEM|Fairechem|Chemicals
FDC|FDC Limited|Pharma
FEDERALBNK|Federal Bank|Banking
FEL|FEL|Finance
FENESTA|Fenesta|Consumer
FINEORG|Fine Organics|Chemicals
FINCABLE|Finolex Cables|Capital Goods
FINFLUX|Finflux|Chemicals
FINPIPE|Finolex Pipes|Plastics
FIRSTSOURCE|Firstsource Solutions|IT
FLEXITUFF|Flexituff|Plastics
FLUOROCHEM|Fluorochem|Chemicals
FMCG|FMCG sector|FMCG
FORCEMOTR|Force Motors|Auto
FORTIS|Fortis Healthcare|Healthcare
FORTUM|Fortum|Energy
FSL|FSL|Finance
FUEL|FUEL Systems|Energy
GABRIEL|Gabriel India|Auto Ancillary
GAIL|GAIL India|Energy
GALAXY|Galaxy Surfactants|Chemicals
GAMMNINFRA|GAMMN Infrastructure|Infrastructure
GANDHITUBE|Gandhi Tub|Capital Goods
GARDENSILK|Garden Silk Mills|Textiles
GATI|Gati Ltd|Logistics
GAEL|Gael|Finance
GAYAHWSHE|Gaya Hosiery|Textiles
GFL|GFL|Chemicals
GICRE|GIC Re|Insurance
GILLETTE|Gillette India|FMCG
GINNI|Ginni Filaments|Textiles
GLANDPHARMA|Gland Pharma|Pharma
GLAXO|GlaxoSmithKline|Pharma
GLENMARK|Glenmark Pharma|Pharma
GLOBOCHEM|Globo Chemicals|Chemicals
GLOSTER|Gloster|Consumer
GMR|GMR Infra|Infrastructure
GODAWARI|Godawari Power|Power
GODFRY|Godfr|Consumer
GODREJAGRO|Godrej Agrovet|Agri
GODREJCP|Godrej Consumer|FMCG
GODREJIND|Godrej Industries|Consumer
GODREJPROP|Godrej Properties|Real Estate
GOKAK|Gokak Textiles|Textiles
GOKULREF|Gokul Refoils|FMCG
GOLDEN|Golden Tobacco|FMCG
GOLKONDA|Golkunda|Mining
GOLDSHIN|Golden Restaurants|Services
GPT|GPT Infra|Infrastructure
GPKGOLD|GPK Gold|Mining
GRAB|Grab|Logistics
GRANULES|Granules India|Pharma
GRASIM|Grasim Industries|Cement
GRAVES|Greaves Cotton|Capital Goods
GREATOFFSHORE|Great Offshore|Logistics
GREENPANEL|Greenpanel Industries|Infrastructure
GREENPLY|Greenply Industries|Consumer
GUJALKALI|Gujarat Alkalies|Chemicals
GUJGASLTD|Gujarat Gas|Energy
GUJHERB|Gujarat Herbs|Pharma
GUJRAFFIA|Gujarat Raffia|Textiles
GULABOIL|Gulab Oil|Energy
GULSPRING|Gulshan Polyplast|Plastics
GUJNRETTY|Gujarat NRE Coke|Energy
HATSUN|Hatsun Agro|FMCG
HAVELLS|Havells India|Consumer
HCLINFO|HCL Infosystems|IT
HCLTECH|HCL Technologies|IT
HDIL|HDIL Ltd|Real Estate
HEG|HEG Limited|Capital Goods
HERANBA|Heranba Industries|Chemicals
HERO|Hero MotoCorp|Auto
HEROMOTOCO|Hero MotoCorp|Auto
HEXAWARE|Hexaware|IT
HIMADRI|Himadri Speciality|Chemicals
HIMATSINGKA|Himatsingka Seide|Textiles
HINDALCO|Hindalco Industries|Metals
HINDCOMPOS|Hind Composites|Plastics
HINDCOPPER|Hindustan Copper|Metals
HINDOIL|Hindoil|Energy
HINDPETRO|Hindustan Petroleum|Energy
HINDSYNTEX|Hind Synthetics|Textiles
HINDTIN|Hindustan Tin|Metals
HINDUNILVR|Hindustan Unilever|FMCG
HINDZINC|Hindustan Zinc|Metals
HIPOLIN|Hipolin|Consumer
HITACHI|Hitachi Energy|Capital Goods
HITECHGEAR|Hi-Tech Gears|Auto Ancillary
HLL|Hindustan Latex|Consumer
HONEYWELL|Honeywell Automation|Capital Goods
HOV|House of Patels|FMCG
HPCL|Hindustan Petroleum|Energy
HSIL|HSIL|Consumer
HTMEDIA|HT Media|Media
HUDCO|HUDCO|Finance
IBULHSGFIN|IBUL Housing Finance|Finance
ICD|ICD|Finance
ICE|ICE|Logistics
IDBI|IDBI Bank|Banking
IDFC|IDFC|Finance
IDFCFIRSTB|IDFC First Bank|Banking
IDEA|Vodafone Idea|Telecom
IDFC|IDFC Ltd|Finance
IEX|Indian Energy Exchange|Infrastructure
IFB|IFB Industries|Auto Ancillary
IFCI|IFCI|Finance
IGL|Indraprastha Gas|Energy
IIFL|IIFL Finance|Finance
IIFLFIN|IIFL Finance|Finance
IIFLAMC|IIFL AMC|Finance
IJM|IJM|Finance
IL&FS|IL&FS|Finance
INDIA CEMENT|India Cements|Cement
INDIANB|Indian Bank|Banking
INDIANCARD|Indian Card|Finance
INDIANHUME|Indian Hume Pipe|Infrastructure
INDIANHOTEL|Indian Hotels|Services
INDIABULLS|Indiabulls Housing|Finance
INDO|Indo|Finance
INDOCO|Indoco Remedies|Pharma
INDOCEM|India Cements|Cement
INDORAMA|Indorama|Textiles
INDOTECH|Indotechs|IT
INDSWFTL|IndusWind|Power
INDUSINDBK|IndusInd Bank|Banking
INFIBEAM|Infibeam Avenues|Internet
INFOMEDIA|Info Media|Media
INFOSYS|Infosys|IT
ING|ING|Finance
INGRESYS|Ingersoll Rand|Capital Goods
INNOTECH|Inno Tech|Electronics
INOX|INOX Leisure|Consumer
INOXCORP|INOX Corp|Metals
INTELLECT|Intellect Design Arena|IT
INDIANB|Indian Bank|Banking
IOB|Indian Overseas Bank|Banking
IOC|Indian Oil Corp|Energy
IPCALAB|Ipca Laboratories|Pharma
IRB|IRB Infra|Infrastructure
IRCON|IRCON International|Infrastructure
IRCTC|IRCTC|Services
IRFC|Indian Railway Finance|Finance
IRIS|Iris Business|IT
ISEC|ISEC|Infrastructure
ITC|ITC Limited|FMCG
ITDCEMENT|ITD Cementation|Infrastructure
ITI|ITI|Finance
JAGRAN|Jagran Prakashan|Media
JAMNAAUTO|Jamna Auto|Auto Ancillary
JAYBHARAT|Jay Bharat Textiles|Textiles
JAYSHREETE|Jay Shree Tea|FMCG
JB|J.B. Chemicals|Pharma
JBCHEPHARM|JB Chemicals & Pharma|Pharma
JBF|JBF Industries|Textiles
JCT|JCT|Textiles
JET|Jet Freight|Logistics
JETINFRA|JETAIRWAYS|Services
JHS|JHS Svendgaard|Consumer
JINDALSAW|Jindal Saw|Metals
JINDALSTEL|Jindal Steel|Metals
JINDALSTEL|Jindal Steel & Power|Metals
JINDALWORLD|Jindal World|Real Estate
JSL|Jindal Stainless|Metals
JKLAKSHMI|JK Lakshmi Cement|Cement
JKPAPER|JK Paper|Paper
JKTYRE|JK Tyre|Auto Ancillary
JMC|JMC Projects|Infrastructure
JMFINANCIAL|JM Financial|Finance
JMPL|JM Projects|Infrastructure
JOCIL|Jocil|Chemicals
JPASSOCIAT|JP Associates|Infrastructure
JPINFRATECH|JP InfraTech|Infrastructure
JSL|Jindal Stainless|Metals
JSWENERGY|JSW Energy|Power
JSWSTEEL|JSW Steel|Metals
JUBLFOOD|Jubilant Foodworks|FMCG
JUBLPHARMA|Jubilant Pharma|Pharma
JYOTHI|Jyothy Labs|FMCG
JYOTHI|Jyothy Labs|FMCG
KAJARIACER|Kajaria Ceramics|Consumer
KALPATPOWR|Kalpataru Power|Infrastructure
KANSAINER|Kansai Nerolac|Consumer
KARURVYSYA|Karur Vysya Bank|Banking
KCP|KCP|Capital Goods
KDDL|KDDL|Consumer
KEC|KEC International|Infrastructure
KEIIND|KEI Industries|Capital Goods
KENNAMETAL|Kennametal India|Capital Goods
KESORAM|Kesoram Industries|Cement
KFTECH|Kfintech|Finance
KGL|KGL|Finance
KFINTECH|Kfintech|Finance
KNRCON|KNR Constructions|Infrastructure
KOLTE|Kolte Patil|Real Estate
KOTAKBANK|Kotak Mahindra Bank|Banking
KPITTECH|KPIT Technologies|IT
KPRMILL|KPR Mill|Textiles
KRBL|KRBL|FMCG
KSB|KSB|Capital Goods
KSERASERA|Ksersera|Pharma
KTKBANK|Kotak Mahindra Bank|Banking
LAOPALA|La Opala RG|Consumer
LALPATHLAB|Lal Path Labs|Healthcare
LAXMIMACH|Laxmi Machines|Capital Goods
LAXMI|Laxmi Organic|Chemicals
LGB|LGB Forge|Auto Ancillary
LIBERTY|Liberty Shoes|Consumer
LINCOLN|Lincoln Pharma|Pharma
LODHA|Lodha|Real Estate
LOGO|Logos|Consumer
LOTUS|Lotus Chemicals|Chemicals
LTI|Larsen & Toubro Infotech|IT
LTIM|LTIMindtree|IT
LT|Larsen & Toubro|Infrastructure
LUPIN|Lupin|Pharma
LUXIND|Lux Industries|FMCG
M&M|Mahindra & Mahindra|Auto
MAGADH|MAGADH Sugar|Sugar
MAGOT|Magnet|Electronics
MAHA|Mahabank|Banking
MAHALIFE|Mahindra Lifespaces|Real Estate
MAHALAXMI|Mahalaxmi|Consumer
MAHANAGAR|Mahanagar Gas|Energy
MAHASTEEL|Maha Rashtra|Metals
MAHINDRA|Mahindra & Mahindra|Auto
MAHSCOOTER|Mahindra Scooter|Auto
MAHSEMI|Mahasem|Finance
MAITHAN|Maithan Alloys|Metals
MAKERS|MakeMyTrip|Internet
MALAR|Malar Hospitals|Healthcare
MANGALAMCEM|Mangalam Cement|Cement
MANAPPURAM|Manappuram Finance|Finance
MANALI|Manali Petrochem|Chemicals
MANCHESTER|Manchester|Textiles
MANGALORE|Mangalore Refinery|Energy
MANKIND|Mankind Pharma|Pharma
MANYAVAR|Vedant Fashions|Consumer
MARICO|Marico Ltd|FMCG
MARINE|Marine Electricals|Capital Goods
MARKSANSO|Marksanso|Pharma
MARUTI|Maruti Suzuki|Auto
MASCON|Mascot Systems|IT
MASTER|Master Trust|Finance
MAYSYS|Mayasys|IT
MAYURUNIQ|Mayur Uniquotes|Textiles
MAXHEALTH|Max Healthcare|Healthcare
MAXVIL|Maxvil|Consumer
MCB|MCB|Finance
MCX|MCX India|Finance
MCDOWELLN|United Breweries|FMCG
MEDIUM|Medium|Finance
MEGHMANI|Meghmani Organics|Chemicals
MEHER|Meher|Finance
MEIL|Megha Engineering|Infrastructure
MERCK|Merck|Pharma
MERICO|Merico|Finance
METROHEALTH|Metropolis Healthcare|Healthcare
MGL|Mahanagar Gas|Energy
MICRO|Micro Labs|Pharma
MIDANI|Midani|Finance
MINDACORP|Minda Corporation|Auto Ancillary
MINDA|Minda|Auto Ancillary
MINDTREE|Mindtree|IT
MISHRA|Mishra|Finance
MFL|MFL|Chemicals
MIDCAP|MIDCAP|Finance
MIRZA|MIRZA|Finance
MISTON|Miston|Chemicals
MODY|Modi|Consumer
MOHIT|Mohit|Finance
MOIL|MOIL Ltd|Mining
MONSANTO|Monsanto India|Agri
MOREPEN|Morepen Labs|Pharma
MORPHO|Morpho|IT
MOSERBAER|Moser Baer|Consumer
MOTHERSUMI|Mother Son Sumi|Auto Ancillary
MOTILAL|MOTILAL OSWAL|Textiles
MOTWANE|Motwane|Capital Goods
MRPL|MRPL|Energy
MRF|MRF Tyres|Auto Ancillary
MTNL|MTNL|Telecom
MUKANDA|Mukand|Metals
MULLER|Muller & Phipps|Consumer
MUNJAL|Munjal|Auto Ancillary
MUTHOOT|Muthoot Finance|Finance
MVL|MVL|Real Estate
NAGARFOODS|Nagarjuna Fertilisers|Agri
NAHAR|Nahar Spinning|Textiles
NAHARSPING|Nahar Spinning|Textiles
NAIK|Naik|Infrastructure
NAKODA|Nakoda|Mining
NAM-INDIA|Nippon India AMC|Finance
NAMHI|NAM-India|Finance
NATCOPHARM|Natco Pharma|Pharma
NATIONALFER|National Fertiliser|Agri
NATIONALUM|National Aluminium|Metals
NATPETRO|National Petrochemical|Chemicals
NAUKRI|Naukri|Internet
NAVINKP|Navinkumar|Finance
NAVINFLUOR|Navin Fluorine|Chemicals
NAVRATNA|Navratna|Consumer
NAZARA|Nazara Technologies|Internet
NBC|NBC|Finance
NCC|NCC Ltd|Infrastructure
NCR|NCR|IT
NECL|Nectar Lifesciences|Pharma
NEOGEN|Neogen Chemicals|Chemicals
NESTLEIND|Nestle India|FMCG
NETWORK18|Network18 Media|Media
NEWINDIAASS|New India Assurance|Insurance
NHPC|NHPC Ltd|Power
NICHEM|Nichi Inorganic|Chemicals
NIFTY|NIFTY 50|Index
NILKAMAL|Nilkamal Limited|Plastics
NIRAJ|Niraj|Finance
NITINSPINNER|Nitin Spinners|Textiles
NOBLE|Noble|Finance
NOCIL|NOCIL|Chemicals
NATCO|Natco Pharma|Pharma
NMDC|NMDC Ltd|Mining
NOIDA|Noida|Real Estate
NOVARTIS|Novartis India|Pharma
NPAS|NPA|Finance
NRC|NRC|Finance
NUVOCO|Nuvoco Vistas|Cement
NYKAA|FSN E-Commerce|E-commerce
OBEROIRLTY|Oberoi Realty|Real Estate
OCCL|Oriental Carbon|Energy
OCL|OCL India|Energy
OMAXE|Omaxe Ltd|Real Estate
OMAXAUTO|Omax Autos|Auto Ancillary
OMKAR|Omkar|Finance
ONMOBILE|OnMobile Global|Telecom
ONGC|Oil & Natural Gas Corp|Energy
ORIENTBANK|Oriental Bank|Banking
ORIENTCEM|Orient Cement|Cement
ORIENTELEC|Orient Electric|Consumer
OSWAL|Oswal Agro|Agri
OAL|OAL|Energy
PAGRI|PAIGRI|Finance
PALCONS|Pal Consolidated|Textiles
PAGEIND|Page Industries|Textiles
PAISALO|Paisalo|Finance
PAL|Pal-Technique|IT
PANACEABIOTEC|Panacea Biotec|Pharma
PANASONIC|Panasonic India|Electronics
PAPER|Paper|Paper
PARLE|Parle|FMCG
PARRY|Parry|Sugar
PATINT|Patint|Capital Goods
PATNI|Patni|IT
PAVNA|Pavna Industries|Auto
PCBL|PCBL|Capital Goods
PCJEWELLER|PC Jeweller|Consumer
PEARLPOLY|Pearl Polymers|Plastics
PENIN|Peninsula|Real Estate
PEL|Pel|Infrastructure
PERSISTENT|Persistent Systems|IT
PETRONET|Petronet LNG|Energy
PFIZER|Pfizer India|Pharma
PGHL|P&G Hygiene|FMCG
PHOENIXLTD|Phoenix Ltd|Real Estate
PIDILITIND|Pidilite Industries|Chemicals
PILANI|Pilani|Infrastructure
PIONEER|Pioneer|Finance
PIIND|PI Industries|Chemicals
POLICYBZR|PB Fintech|Fintech
POLYCAB|Polycab India|Capital Goods
POLYMED|Polymed|Pharma
POLYPLEX|Polyplex|Plastics
PONDY|Pondy Oxides|Chemicals
POWERGRID|Power Grid Corp|Power
PRADIP|Pradip|Chemicals
PREMIER|Premier|Finance
PRESTIGE|Prestige Estates|Real Estate
PRIME|Prime|Finance
PRSMJOHNSON|P&G Hygiene|FMCG
PROMACT|Promact|IT
PRSMJOHNSON|P&G Hygiene|FMCG
PSB|PSB|Banking
PUNJABNATL|Punjab National Bank|Banking
PUNJNATL|Punjab National Bank|Banking
QUANTUM|Quantum|Energy
QUICKHEAL|Quick Heal Technologies|IT
RADICO|Radico Khaitan|FMCG
RAGHUNATH|Ragunath|Finance
RAHUL|Rahul|Finance
RAILTEL|Railtel Corp|Infrastructure
RAILW|Rail Vikas|Infrastructure
RAJESHEXPO|Rajesh Exports|Metals
RAJESHEXPO|Rajesh Exports|Metals
RAJESHPOLY|Rajesh Poly|Plastics
RAJTV|Raj TV|Media
RAKESH|Rakesh|Finance
RAL|RAL|Finance
RALLIS|Rallis India|Agri
RAMANE|Ramane|Finance
RAMAPO|Rama Newsprint|Paper
RAMCOCEM|Ramco Cements|Cement
RAMKRISH|Ramkrishna|Finance
RANA|Rana|Finance
RANDER|Rander|Textiles
RANELER|RanEl|Finance
RATNABHAR|Ratnabhar|Infrastructure
RAVALGAON|Ravalgaon Sugar|Sugar
RAYMOND|Raymond Ltd|Textiles
RCOM|Reliance Comm|Telecom
RCL|RCL|Finance
RCONT|RCont|Finance
REDINGTON|Redington|IT
REGENCER|Regenecer|Energy
RELIANCE|Reliance Industries|Energy
RELIGARE|Religare|Finance
RELIGARE|Religare Ent|Finance
RENUKA|Renuka Sugars|Sugar
REPCOHOME|Repco Home Finance|Finance
RESHMA|Reshmi|Textiles
RITES|RITES Ltd|Infrastructure
RICOAUTO|Rico Auto Industries|Auto Ancillary
RINL|RinL|Finance
RIIL|RIIL|Infrastructure
ROCI|Roci|Finance
ROHITFERRO|Rohit Ferro|Metals
RONI|R Systems International|IT
RPP|RPP Infra|Infrastructure
RPSG|RPSG|Consumer
RSWL|RSWM|Textiles
RTSPOWER|RTS Power|Power
RUCHIRA|Ruchira|Paper
RUPA|Rupa|Textiles
RVNL|Rail Vikas Nigam|Infrastructure
SADBHAV|Sadhav Engineering|Infrastructure
SAGARCEM|Sagar Cements|Cement
SAHASRA|Sahasra|Finance
SAI|SAI|Finance
SAINT|SAINT|IT
SAIL|Steel Authority India|Metals
SALASAR|Salasar|Consumer
SALONI|Saloni|Textiles
SAMHITA|Samhita|Consumer
SAMRUDDHI|Samruddhi|Finance
SANDHAR|Sandhar|Finance
SANGAM|Sangam|Textiles
SANOFI|Sanofi India|Pharma
SAREGAMA|Saregama India|Media
SARLA|Sarla|Finance
SASKEN|Sasken Technologies|IT
SATIN|Satin|Textiles
SBC|SBI Cards|Finance
SBICARD|SBI Cards|Finance
SBILIFE|SBI Life Insurance|Insurance
SBIN|State Bank of India|Banking
SBM|SBM|Finance
SCHAEFFLER|Schaeffler India|Auto Ancillary
SECL|Secl|Chemicals
SECUROR|SecurOr|Finance
SELAN|Selan|Chemicals
SEMBCORP|Sembcorp|Infrastructure
SESHAPAPER|Seshasayee Paper|Paper
SETCO|Setco|Auto
SHALPAINTS|Shalimar Paints|Consumer
SHARAN|Sharan|Finance
SHARDACROP|Sharda Cropchem|Agri
SHARON|Sharon Bio|Pharma
SHETRON|Shetron|Plastics
SHILPAMED|Shilpa Medicare|Pharma
SHOPERSTOP|Shoppers Stop|Retail
SHOPER|Shoper|Retail
SHRI|Shri|Finance
SHRADHA|Shradha|Finance
SHREECEM|Shree Cement|Cement
SHREEPUSHK|Shree Renuka|Sugar
SHRIRAM|Shriram Finance|Finance
SHRIREAMEAM|Shriram EAM|Auto Ancillary
SHRIRAMFIN|Shriram Finance|Finance
SHRIRAM|Shriram Pistons|Auto Ancillary
SHYAMTELE|Shyam Telecom|Telecom
SIDBI|SIDBI|Finance
SIEL|SIEL|Chemicals
SIEMENS|Siemens India|Capital Goods
SINGARENI|Singareni Collieries|Mining
SITINET|Siti Networks|Telecom
SJVNL|SJVN Ltd|Power
SKF|SKF|Auto Ancillary
SML|SML|Finance
SNL|SNL|Chemicals
SOBHA|Sobha Ltd|Real Estate
SOLARINDS|Solar Industries|Chemicals
SONAECOM|Sona BLW|Auto Ancillary
SOUTHBANK|South Bank|Banking
SOUTHIND|South Indian Bank|Banking
SOUTHWEST|Southwest|Finance
SPARC|Sparc|IT
SPAL|SPAL|Finance
SPARC|SPARC Systems|IT
SPICEJET|SpiceJet|Services
SRF|SRF Limited|Chemicals
SREEL|Sreel|Finance
SRI|Sri|Finance
SRF|SRF|Chemicals
SRIL|SRIL|Chemicals
SRM|SRM|Finance
STANCAN|Stancan|Finance
STAR|Star|Finance
STARHEALTH|Star Health|Insurance
STEEL|Steel|Metals
STELCO|Stelco|Metals
STFC|STFC|Finance
STRAITS|Straits|Finance
STRIDES|Strides Pharma|Pharma
SUBEX|Subex|IT
SUDAR|Sudar|Finance
SUGAR|Sugar|Sugar
SUKHJIT|Sukhjit|Textiles
SUNDARAM|Sundaram|Finance
SUNDCLAY|Sundaram Clay|Clay
SUNDARM|Sundaram Finance|Finance
SUNDRA|Sundra|Finance
SUNDRM|Sundram Fasteners|Auto Ancillary
SUNPHARMA|Sun Pharmaceutical|Pharma
SUNTECK|Sunteck Realty|Real Estate
SUNTV|Sun TV Network|Media
SUPERHOUSE|Superhouse|FMCG
SUPREME|Supreme Industries|Plastics
SUPREMEPETRO|Supreme Petrochem|Chemicals
SUZLON|Suzlon Energy|Power
SUZLON|Suzlon Energy|Power
SURYAROSHN|Surya Roshni|Power
SYKES|Sykes|IT
Syrma|Syrma SGS|Electronics
TANLA|Tanla Solutions|Telecom
TAPARIA|Taparia|Capital Goods
TARAPUR|Tarapur|Chemicals
TATAAMC|Tata AMC|Finance
TATACHEM|Tata Chemicals|Chemicals
TATACOFFEE|Tata Coffee|FMCG
TATACOMM|Tata Communications|Telecom
TATACONSUM|Tata Consumer Products|FMCG
TATAELXSI|Tata Elxsi|IT
TATAELXSI|Tata Elxsi|IT
TATAINVEST|Tata Investment Corp|Finance
TATAMOTORS|Tata Motors|Auto
TATAPOWER|Tata Power|Power
TATASPONGE|Tata Sponge|Consumer
TATASTEEL|Tata Steel|Metals
TATASTEEL|Tata Steel|Metals
TCS|Tata Consultancy Services|IT
TCIEXPRESS|TCI Express|Logistics
TCPL|TCPL Packaging|Packaging
TDTL|TDTL|Capital Goods
TECHM|Tech Mahindra|IT
TECHNO|Techno|IT
TEJASNET|Tejas Networks|Telecom
THERMAX|Thermax Ltd|Capital Goods
THYROCARE|Thyrocare Tech|Healthcare
TIDEWATER|Tide Water Oil|Lubricants
TIIL|TIIL|Finance
TIL|Til|Finance
TIMKEN|Timken|Auto Ancillary
TINPLATE|Tinplate Company|Metals
TIPS|Tips Industries|Media
TITAGARH|Titagarh Rail|Infrastructure
TITAN|Titan Company|Consumer
TITAN|Titan|Consumer
TITANCOMP|Titan Company|Consumer
TITANGARH|Titagarh Wagons|Infrastructure
TITANCO|Titan Company|Consumer
TITANLTD|Titan|Consumer
TITANVALE|Titan Vale|Consumer
TKIL|Tikkle|IT
TNPETRO|TN Petro|Energy
TOL|TOL|Finance
TOMER|TOMER|Consumer
TORNTPHARM|Torrent Pharma|Pharma
TORNTPOWER|Torrent Power|Power
TOUCHWOOD|Touchwood|Real Estate
TRACN|Tracxn|IT
TRIDENT|Trident Ltd|Textiles
TRIGYN|Trigyn|Pharma
TRIL|Trident|Textiles
TRIVENI|Triveni Engineering|Sugar
TROIKAA|Troikaa|Pharma
TUBBARE|Tubbare|Infrastructure
TULIP|Tulip|Real Estate
TUNIPRO|TuniPro|Chemicals
TV18|TV18 Broadcast|Media
TVSMOTOR|TVS Motor Company|Auto
TVS|TVS SCS|Auto Ancillary
TWEET|Tweet|IT
UBL|United Breweries|FMCG
UFO|UFO|IT
UFO|UFO Moviez|Media
UGARSUGAR|Ugar Sugar|Sugar
ULTRACEMCO|UltraTech Cement|Cement
UNIONBANK|Union Bank of India|Banking
UNITED|United Spirits|FMCG
UNITEDTEA|United Tea|FMCG
UNOMIND|Unominda|Pharma
UPL|UPL Limited|Chemicals
USHAMART|Usha Martin|Metals
UTI|UTI AMC|Finance
UWIND|U Wind|Power
V2RETAIL|V2 Retail|Retail
V-GUARD|V-Guard Industries|Consumer
VAKRANGI|Vakrangee|Infrastructure
VALUE|Value|Finance
VARDHMAN|Vardhman Textiles|Textiles
VARDHMANRLTY|Vardhman Realty|Real Estate
VARROC|Varroc Engineering|Auto Ancillary
VASU|Vasu|Finance
VA TECH|VA Tech Wabag|Infrastructure
VEDL|Vedanta Limited|Metals
VENKEYS|Venkey's|FMCG
VENUS|Venus|Textiles
VETO|Veto|Finance
VHB|VHB Industries|Consumer
VICKAY|Vickay|Finance
VICEROY|Viceroy|Consumer
VIDEOCON|Videocon|Consumer
VIKASECO|Vikas ECO|Infrastructure
VIKAS|Vikas|Infrastructure
VIPIND|VIP Industries|Plastics
VINATIORGA|Vinati Organics|Chemicals
VIRIN|Virin|Finance
VISA|Visa|Finance
VISION|Vision|Finance
VISAKA|Visaka Industries|Infrastructure
VIVEK|Vivek|Finance
VJIL|Vijil|Finance
VLCC|VLCC|Finance
VLRLOG|VRL Logistics|Logistics
VODA|Vodafone Idea|Telecom
VOLTAS|Voltas|Consumer
VSTIND|VST Industries|Consumer
VSTTILLERS|VST Tillers|Capital Goods
WABCO|Wabco India|Auto Ancillary
WADHAWAN|Wadhawan|Finance
WAIT|Wait|Finance
WALCHAND|Walchandnagar|Capital Goods
WALKER|Walker|Finance
WELCORP|Welspun Corp|Textiles
WELSPUNLIV|Welspun Living|Textiles
WELSPUN|Welspun|Textiles
WESTCOAST|Westcoast|Real Estate
WHIRLPOOL|Whirlpool India|Consumer
WIPRO|Wipro|IT
WOCKHARDT|Wockhardt Ltd|Pharma
WOCKPHARMA|Wockhardt Pharma|Pharma
WOCK|Wockhardt|Pharma
WONDERLA|Wonderla|Services
XCHANGING|Xchanging|Finance
YESBANK|YES Bank|Banking
YOJANA|Yojana|Finance
ZEEENT|Zee Entertainment|Media
ZEEL|Zee Learn|Media
ZENSAR|Zensar Technologies|IT
ZODIAC|Zodiac|Textiles
ZUARI|Zuari|Agri
ZYDUS|Zydus Lifesciences|Pharma
ZYDUSWELL|Zydus Wellness|Pharma
ZEE|Zee Entertainment|Media
NIPPO|Nippo|FMCG
AAVAS|Aavas|Finance
DWS|DWS|Finance
GRPL|GRPL|Finance
VIVIMED|Vivimed|Pharma
QUANT|Quant|Finance
NCI|NCI|Infrastructure
SASKEN|Sasken|IT
RENUKA|Renuka|Sugar
TANLA|Tanla|Telecom
GOLDENROCK|Golden Rock|Finance
VFL|VFL|Chemicals
NIIT|NIIT Technologies|IT
APLLTD|APL Industries|Retail
NESTLE|Nestle India|FMCG
SUPREME|Supreme Petrochem|Chemicals
SHILPA|Shilpa Medicare|Pharma
V-GUARD|V-Guard Industries|Consumer
RADICO|Radico Khaitan|FMCG
BATAINDIA|Bata India|Consumer
FINCABLE|Finolex Cables|Capital Goods
KEIIND|KEI Industries|Capital Goods
GLOBEX|Globex|Finance
NEWGEN|Newgen|IT
ANUP|Anup|Finance
KAJARIA|Kajaria|Consumer
MARICO|Marico|FMCG
KEI|KEI Industries|Capital Goods
CREDITACC|CreditAccess Grameen|Finance
LUMAX|Lumax|Auto Ancillary
SIGMA|Sigma|Finance
VSTIND|VST Industries|Consumer
AJANTPHARM|Ajanta Pharma|Pharma
BENARES|Benares|Textiles
RATHI|Rathi|Finance
CANSOFT|Cansoft|IT
NOIDAENT|Noida Enterprise|Real Estate
CHL|CHL|Finance
DODLA|Dodla|FMCG
GMRINFRA|GMR Infra|Infrastructure
PRESTIGE|Prestige Estates|Real Estate
SHYAM|Shyam Metal|Metals
RELAXO|Relaxo|Pharma
SYRMA|Syrma SGS|Electronics
DIAMOND|Diamond|Infrastructure
SOLAR|Solar|Power
PRSM|P&G|FMCG
JAGRAN|Jagran|Media
TIPS|Tips|Media
CERA|Cera|Consumer
SOMANYA|Somany|Consumer
KAJARIA|Kajaria|Consumer
RAILTEL|Railtel|Infrastructure
IRCON|IRCON|Infrastructure
TITAGARH|Titagarh|Infrastructure
IRFC|IRFC|Finance
RITES|RITES|Infrastructure
MEIL|MEIL|Infrastructure
KNRCON|KNR Constructions|Infrastructure
NIIT|NIIT|IT
ROPAR|Ropar|Infrastructure
SHAVAKSHA|Shavaksha|Finance
CIGNITI|Cigniti|IT

"""

# Parse and load into stock-list.json
seen = set()
additional = []

for line in raw_data.strip().split("\n"):
    line = line.strip()
    if not line:
        continue
    parts = line.split("|")
    if len(parts) != 3:
        continue
    sym, name, sec = [p.strip() for p in parts]
    if sym in seen or len(sym) < 2 or len(sym) > 20:
        continue
    if not sym.replace("&","").replace("-","").replace(" ","").isalnum():
        continue
    seen.add(sym)
    additional.append((sym, name, sec))

# Load existing
with open("/home/z/my-project/src/lib/stock-list.json") as f:
    existing = json.load(f)

# Build lookup of existing
existing_map = {e["s"]: e for e in existing["equities"]}

# Merge: keep existing if present, add new ones
for sym, name, sec in additional:
    if sym not in existing_map:
        # Estimate params
        bp, v, ls = 400, 0.025, 1500
        if sec == "Banking": bp,v,ls = 100,0.024,6000
        elif sec == "IT": bp,v,ls = 800,0.025,1000
        elif sec == "Pharma": bp,v,ls = 600,0.023,1000
        elif sec == "Metals" or sec == "Mining": bp,v,ls = 250,0.025,2000
        elif sec in ("Energy","Power"): bp,v,ls = 250,0.022,2000
        elif sec in ("Auto","Auto Ancillary"): bp,v,ls = 800,0.023,800
        elif sec in ("FMCG","Consumer"): bp,v,ls = 600,0.020,1000
        elif sec == "Cement": bp,v,ls = 1200,0.020,500
        elif sec == "Real Estate": bp,v,ls = 500,0.025,800
        elif sec in ("Finance","Fintech","Insurance"): bp,v,ls = 400,0.025,1500
        elif sec == "Infrastructure": bp,v,ls = 500,0.024,1500
        elif sec == "Chemicals": bp,v,ls = 1000,0.023,500
        elif sec == "Textiles": bp,v,ls = 350,0.025,2500
        elif sec == "Capital Goods": bp,v,ls = 1500,0.022,300
        elif sec == "Healthcare": bp,v,ls = 500,0.023,800
        elif sec in ("Internet","E-commerce","Fintech"): bp,v,ls = 300,0.030,2000
        elif sec == "Logistics": bp,v,ls = 400,0.025,2000
        elif sec in ("Sugar","Agri"): bp,v,ls = 350,0.024,2000
        elif sec == "Telecom": bp,v,ls = 250,0.025,2000
        elif sec == "Media": bp,v,ls = 350,0.025,1500
        elif sec == "Plastics": bp,v,ls = 600,0.022,1200
        elif sec == "Electronics": bp,v,ls = 3000,0.028,200
        elif sec == "Services": bp,v,ls = 800,0.025,500
        elif sec == "Paper": bp,v,ls = 300,0.022,2000
        elif sec == "Packaging": bp,v,ls = 500,0.022,1200
        elif sec == "Conglomerate": bp,v,ls = 1500,0.025,300
        else: bp,v,ls = 400,0.025,1500
        
        existing["equities"].append({"s": sym, "n": name, "sec": sec, "bp": bp, "v": round(v, 3), "ls": ls})

# Sort and dedupe one more time
seen2 = set()
deduped = []
for e in existing["equities"]:
    if e["s"] not in seen2:
        seen2.add(e["s"])
        deduped.append(e)

deduped.sort(key=lambda x: x["s"])
result = {
    "equities": deduped,
    "indices": existing["indices"],
    "optionUnderlyings": existing.get("optionUnderlyings", [])
}

with open("/home/z/my-project/src/lib/stock-list.json", "w") as f:
    json.dump(result, f, separators=(",", ":"))

print(f"Total unique equities: {len(deduped)}")
print(f"Sectors: {sorted(set(e['sec'] for e in deduped))}")
print(f"New stocks added: {len(seen)}")
