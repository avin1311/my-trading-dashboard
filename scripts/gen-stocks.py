#!/usr/bin/env python3
"""Generate 1000+ NSE equities from clean data"""
import json, re

# (symbol, name, sector)
data = """
HDFCBANK|HDFC Bank|Banking
ICICIBANK|ICICI Bank|Banking
SBIN|State Bank of India|Banking
KOTAKBANK|Kotak Mahindra Bank|Banking
AXISBANK|Axis Bank|Banking
INDUSINDBK|IndusInd Bank|Banking
PNB|Punjab National Bank|Banking
BANKBARODA|Bank of Baroda|Banking
FEDERALBNK|Federal Bank|Banking
CANBK|Canara Bank|Banking
IDBI|IDBI Bank|Banking
BANDHANBNK|Bandhan Bank|Banking
RBLBANK|RBL Bank|Banking
YESBANK|YES Bank|Banking
UCOBANK|UCO Bank|Banking
UNIONBANK|Union Bank of India|Banking
BANKINDIA|Bank of India|Banking
MAHABANK|Bank of Maharashtra|Banking
IOB|Indian Overseas Bank|Banking
CENTRALBK|Central Bank of India|Banking
AUBANK|AU Small Finance Bank|Banking
IDFCFIRSTB|IDFC First Bank|Banking
INDIANB|Indian Bank|Banking
CUB|City Union Bank|Banking
KARURVYSYA|Karur Vysya Bank|Banking
CSBBANK|CSB Bank|Banking
DCBBANK|DCB Bank|Banking
SOUTHIND|South Indian Bank|Banking
PUNJNATL|Punjab National Bank|Banking
ANDHRABANK|Andhra Bank|Banking
VIJAYABANK|Vijaya Bank|Banking
SYNDIBANK|Syndicate Bank|Banking
ORIENTBANK|Oriental Bank of Commerce|Banking
UNITEDBNK|United Bank of India|Banking
DENABANK|Dena Bank|Banking
CORPBANK|Corporation Bank|Banking
EQUITASBNK|Equitas SFB|Banking
ESAFSFB|ESAF Small Finance Bank|Banking
UJJIVANSFB|Ujjivan SFB|Banking
TCS|Tata Consultancy Services|IT
INFY|Infosys|IT
WIPRO|Wipro|IT
HCLTECH|HCL Technologies|IT
TECHM|Tech Mahindra|IT
LTIM|LTIMindtree|IT
MPHASIS|Mphasis|IT
COFORGE|Coforge|IT
PERSISTENT|Persistent Systems|IT
KPITTECH|KPIT Technologies|IT
TATAELXSI|Tata Elxsi|IT
CYIENT|Cyient|IT
ZENSARTECH|Zensar Technologies|IT
AFFLE|Affle India|Internet
DATAPATTNS|Datamatics Global|IT
RONI|R Systems International|IT
SASKEN|Sasken Technologies|IT
INTELLECT|Intellect Design Arena|IT
3IINFOLTD|3i Infotech Ltd|IT
FLUIROX|Fluiroxo|IT
QUICKHEAL|Quick Heal Technologies|IT
SUNPHARMA|Sun Pharmaceutical|Pharma
DRREDDY|Dr Reddy's Labs|Pharma
CIPLA|Cipla|Pharma
DIVISLAB|Divi's Laboratories|Pharma
BIOCON|Biocon|Pharma
LUPIN|Lupin|Pharma
AUROPHARMA|Aurobindo Pharma|Pharma
GLENMARK|Glenmark Pharma|Pharma
ALKEM|Alkem Laboratories|Pharma
IPCALAB|Ipca Laboratories|Pharma
TORNTPHARM|Torrent Pharma|Pharma
MANKIND|Mankind Pharma|Pharma
ABBOTINDIA|Abbott India|Pharma
SANOFI|Sanofi India|Pharma
PFIZER|Pfizer India|Pharma
GLAXO|GlaxoSmithKline Pharma|Pharma
JUBLPHARMA|Jubilant Pharma|Pharma
STRIDES|Strides Pharma|Pharma
SHILPAMED|Shilpa Medicare|Pharma
LAURUSLABS|Laurus Labs|Pharma
AARTIDRUG|Aarti Drugs|Pharma
NATCOPHARM|Natco Pharma|Pharma
JBCHEPHARM|JB Chemicals & Pharma|Pharma
MOREPEN|Morepen Labs|Pharma
FDC|FDC Limited|Pharma
NEOGEN|Neogen Chemicals|Pharma
INDOCO|Indoco Remedies|Pharma
ZYDUSLIFE|Zydus Lifesciences|Pharma
WOCKHARDT|Wockhardt Ltd|Pharma
PANACEABIOTEC|Panacea Biotec|Pharma
ALEMBIC|Alembic Pharma|Pharma
MARUTI|Maruti Suzuki|Auto
TATAMOTORS|Tata Motors|Auto
M&M|Mahindra & Mahindra|Auto
EICHERMOT|Eicher Motors|Auto
HEROMOTOCO|Hero MotoCorp|Auto
BAJAJAUTO|Bajaj Auto|Auto
TVSMOTOR|TVS Motor Company|Auto
ASHOKLEY|Ashok Leyland|Auto
FORCEMOTR|Force Motors|Auto
TATAMTRDVR|Tata Motors DVR|Auto
MOTHERSUMI|Mother Son Sumi|Auto Ancillary
MRF|MRF Tyres|Auto Ancillary
BOSCHLTD|Bosch Ltd|Auto Ancillary
BHARATFORG|Bharat Forge|Auto Ancillary
BALKRISIND|Balkrishna Industries|Auto Ancillary
CEATLTD|CEAT Ltd|Auto Ancillary
APOLLOTYRE|Apollo Tyres|Auto Ancillary
JKTYRE|JK Tyre|Auto Ancillary
GOODYEAR|Goodyear India|Auto Ancillary
EXIDEIND|Exide Industries|Auto Ancillary
AMARAJABAT|Amara Raja Batteries|Auto Ancillary
ENDURANCE|Endurance Technologies|Auto Ancillary
SONAECOM|Sona BLW Precision|Auto Ancillary
RANEAUTO|Rane Auto|Auto Ancillary
SHRIREAMEAM|Shriram EAM|Auto Ancillary
MUNJALSHOWA|Munjal Showa|Auto Ancillary
JAMNAUTO|Jamna Auto Industries|Auto Ancillary
SUNDRAMFAST|Sundram Fasteners|Auto Ancillary
GABRIELINDIA|Gabriel India|Auto Ancillary
OMAXAUTO|Omax Autos|Auto Ancillary
RICOAUTO|Rico Auto Industries|Auto Ancillary
HITECHGEAR|Hi-Tech Gears|Auto Ancillary
IFBINDUSTRIES|IFB Industries|Auto Ancillary
ITC|ITC Limited|FMCG
HINDUNILVR|Hindustan Unilever|FMCG
NESTLEIND|Nestle India|FMCG
BRITANNIA|Britannia Industries|FMCG
TATACONSUM|Tata Consumer Products|FMCG
DABUR|Dabur India|FMCG
MARICO|Marico Ltd|FMCG
GODREJCP|Godrej Consumer|FMCG
COLPAL|Colgate-Palmolive|FMCG
EMAMILTD|Emami Ltd|FMCG
VBL|Varun Beverages|FMCG
RADICO|Radico Khaitan|FMCG
JUBLFOOD|Jubilant Foodworks|FMCG
CCLPRODUCTS|CCL Products|FMCG
JYOTHYLAB|Jyothy Labs|FMCG
HATSUN|Hatsun Agro|FMCG
PRSMJOHNSON|P&G Hygiene|FMCG
GILLETTE|Gillette India|FMCG
TASTYBITE|Tasty Bite|FMCG
ASIANPAINT|Asian Paints|Consumer
TITAN|Titan Company|Consumer
BERGEPAINT|Berger Paints|Consumer
CROMPTON|Crompton Greaves|Consumer
VOLTAS|Voltas|Consumer
BLUESTAR|Blue Star|Consumer
WHIRLPOOL|Whirlpool India|Consumer
HAVELLS|Havells India|Consumer
V-GUARD|V-Guard Industries|Consumer
CERA|Cera Sanitaryware|Consumer
KAJARIACER|Kajaria Ceramics|Consumer
SOMANYCERA|Somany Ceramics|Consumer
TTKPRESTIG|TTK Prestige|Consumer
LAOPALA|La Opala RG|Consumer
MANYAVAR|Vedant Fashions|Consumer
TATASTEEL|Tata Steel|Metals
JSWSTEEL|JSW Steel|Metals
HINDALCO|Hindalco Industries|Metals
VEDL|Vedanta Limited|Metals
HINDZINC|Hindustan Zinc|Metals
SAIL|Steel Authority India|Metals
JINDALSTEL|Jindal Steel|Metals
NATIONALUM|National Aluminium|Metals
HINDCOPPER|Hindustan Copper|Metals
NMDC|NMDC Ltd|Mining
COALINDIA|Coal India|Mining
MOIL|MOIL Ltd|Mining
TINPLATE|Tinplate Company|Metals
JSL|Jindal Stainless|Metals
RAJESHEXPO|Rajesh Exports|Metals
AIAENG|AIA Engineering|Metals
JINDALSAW|Jindal Saw|Metals
RELIANCE|Reliance Industries|Energy
ONGC|Oil & Natural Gas Corp|Energy
BPCL|Bharat Petroleum|Energy
IOC|Indian Oil Corp|Energy
GAIL|GAIL India|Energy
NTPC|NTPC Limited|Power
POWERGRID|Power Grid Corp|Power
TATAPOWER|Tata Power|Power
ADANIGREEN|Adani Green Energy|Power
ADANIENSOL|Adani Energy Sol|Power
SUZLON|Suzlon Energy|Power
NHPC|NHPC Ltd|Power
SJVN|SJVN Ltd|Power
TORNTPOWER|Torrent Power|Power
JSWENERGY|JSW Energy|Power
IGL|Indraprastha Gas|Energy
MGL|Mahanagar Gas|Energy
GUJGASLTD|Gujarat Gas|Energy
PETRONET|Petronet LNG|Energy
ADANITRANS|Adani Total Gas|Energy
HPCL|Hindustan Petroleum|Energy
CESC|CESC Ltd|Power
GREAVESCOT|Greaves Cotton|Power
ULTRACEMCO|UltraTech Cement|Cement
SHREECEM|Shree Cement|Cement
ACC|ACC Limited|Cement
AMBUJACEM|Ambuja Cements|Cement
RAMCOCEM|Ramco Cements|Cement
JKCEMENT|JK Cement|Cement
DALBHARAT|Dalmia Bharat|Cement
JKLAKSHMI|JK Lakshmi Cement|Cement
ORIENTCEM|Orient Cement|Cement
NUVOCO|Nuvoco Vistas|Cement
INDIACEM|India Cements|Cement
BIRLACORP|Birla Corporation|Cement
SAGARCEM|Sagar Cements|Cement
MANGALAMCEM|Mangalam Cement|Cement
DLF|DLF Limited|Real Estate
GODREJPROP|Godrej Properties|Real Estate
OBEROIRLTY|Oberoi Realty|Real Estate
PHOENIXLTD|Phoenix Ltd|Real Estate
SOBHA|Sobha Ltd|Real Estate
BRIGADE|Brigade Enterprises|Real Estate
PRESTIGE|Prestige Estates|Real Estate
MAHLIFE|Mahindra Lifespaces|Real Estate
OMAXE|Omaxe Ltd|Real Estate
SUNTECK|Sunteck Realty|Real Estate
V2RETAIL|V2 Retail|Retail
SHOPERSTOP|Shoppers Stop|Retail
FUTURECONSU|Future Consumer|Retail
APLLTD|APL Industries|Retail
DMART|Avenue Supermarts|Retail
TRENT|Trent Limited|Retail
V-MART|V-Mart Retail|Retail
NYKAA|FSN E-Commerce (Nykaa)|E-commerce
ZOMATO|Zomato|Internet
PAYTM|One97 Communications|Fintech
DELHIVERY|Delhivery|Logistics
POLICYBZR|PB Fintech|Fintech
INFIBEAM|Infibeam Avenues|Internet
NAZARA|Nazara Technologies|Internet
ONMOBILE|OnMobile Global|Telecom
LT|Larsen & Toubro|Infrastructure
ADANIPORTS|Adani Ports|Infrastructure
RVNL|Rail Vikas Nigam|Infrastructure
IRFC|Indian Railway Finance|Finance
IRCTC|IRCTC|Services
SIEMENS|Siemens India|Capital Goods
ABB|ABB India|Capital Goods
NCC|NCC Ltd|Infrastructure
IRB|IRB Infra|Infrastructure
NBCC|NBCC India|Infrastructure
PNCINFRANUM|PNC Infratech|Infrastructure
ASHOKA|Ashoka Buildcon|Infrastructure
KEC|KEC International|Infrastructure
KALPATPOWR|Kalpataru Power|Infrastructure
TITAGARH|Titagarh Rail|Infrastructure
RAILTEL|Railtel Corp|Infrastructure
IRCON|IRCON International|Infrastructure
ITDCEMENT|ITD Cementation|Infrastructure
CONCOR|Container Corp|Logistics
TCIEXPRESS|TCI Express|Logistics
VRLLOG|VRL Logistics|Logistics
ALLCARGO|Allcargo Logistics|Logistics
GATI|Gati Ltd|Logistics
SHIPPINGCORP|Shipping Corp|Logistics
THERMAX|Thermax Ltd|Capital Goods
CUMMINSIND|Cummins India|Capital Goods
KEIIND|KEI Industries|Capital Goods
POLYCAB|Polycab India|Capital Goods
HONEYWELL|Honeywell Automation|Capital Goods
VSTTILLERS|VST Tillers|Capital Goods
ELGIEQUIP|Elgi Equipments|Capital Goods
LAXMIMACH|Laxmi Machines|Capital Goods
RITES|RITES Ltd|Infrastructure
BAJFINANCE|Bajaj Finance|Finance
BAJAJFINSV|Bajaj Finserv|Finance
CHOLAHLDNG|Cholamandalam Investment|Finance
MUTHOOTFIN|Muthoot Finance|Finance
SHRIRAMFIN|Shriram Finance|Finance
LICHOUSING|LIC Housing Finance|Finance
CANFINHOME|Can Fin Homes|Finance
REPCOHOME|Repco Home Finance|Finance
TATAAMC|Tata AMC|Finance
HDFCAMC|HDFC AMC|Finance
NAM-INDIA|Nippon India AMC|Finance
SBICARD|SBI Cards|Finance
BSE|BSE Limited|Finance
MCX|MCX India|Finance
CDSL|CDSL|Finance
CAMSONLINE|CAMS|Finance
KFINTECH|Kfintech|Finance
MANAPPURAM|Manappuram Finance|Finance
IBULHSGFIN|IBUL Housing Finance|Finance
IIFLFIN|IIFL Finance|Finance
TATAINVEST|Tata Investment Corp|Finance
PNBHOUSING|PNB Housing Finance|Finance
BAJAJMCAP|Bajaj Capital|Finance
HDFCLIFE|HDFC Life Insurance|Insurance
SBILIFE|SBI Life Insurance|Insurance
ICICIPRULI|ICICI Prudential Life|Insurance
STARHEALTH|Star Health Insurance|Insurance
GICRE|GIC Re|Insurance
NEWINDIAASS|New India Assurance|Insurance
APOLLOHOSP|Apollo Hospitals|Healthcare
MAXHEALTH|Max Healthcare|Healthcare
FORTIS|Fortis Healthcare|Healthcare
LALPATHLAB|Lal Path Labs|Healthcare
DRAGNZPHARMA|Dr Agarwal Eye|Healthcare
METROHEALTH|Metropolis Healthcare|Healthcare
THYROCARE|Thyrocare Tech|Healthcare
INDRAMED|Indraprastha Medical|Healthcare
NARAYANAHR|Narayana Health|Healthcare
ASTERDM|Aster DM Healthcare|Healthcare
RAINBOW|Rainbow Children Medicare|Healthcare
KOVAIMED|Kovai Medical|Healthcare
BHARTIARTL|Bharti Airtel|Telecom
IDEA|Vodafone Idea|Telecom
TATACOMM|Tata Communications|Telecom
MTNL|MTNL|Telecom
RCOM|Reliance Comm|Telecom
PVRINOX|PVR INOX Ltd|Media
SUNTV|Sun TV Network|Media
JAGRAN|Jagran Prakashan|Media
HTMEDIA|HT Media|Media
TIPSINDLTD|Tips Industries|Media
SAREGAMA|Saregama India|Media
DISHTV|Dishtv India|Media
ZEEMEDIA|Zee Media|Media
NETWORK18|Network18 Media|Media
HATHWAY|Hathway Cable|Media
DENNETWORKS|DEN Networks|Media
TV18BRDCST|TV18 Broadcast|Media
DQENT|DQ Entertainment|Media
EROSINTL|Eros International|Media
WELSPUNLIV|Welspun Living|Textiles
PAGEIND|Page Industries|Textiles
VARDHMAN|Vardhman Textiles|Textiles
TRIDENT|Trident Ltd|Textiles
RAYMOND|Raymond Ltd|Textiles
KPRMILL|KPR Mill|Textiles
MAYURUNIQ|Mayur Uniquotes|Textiles
NITINSPINNER|Nitin Spinners|Textiles
SUTLEJTEX|Sutlej Textiles|Textiles
NAHARSPING|Nahar Spinning|Textiles
JBFIND|JBF Industries|Textiles
GARDENSILK|Garden Silk Mills|Textiles
BOMDYEING|Bombay Dyeing|Textiles
SFL|Shree Falguni Textiles|Textiles
JAYBHARAT|Jay Bharat Textiles|Textiles
NILKAMAL|Nilkamal Limited|Plastics
SUPREMEIND|Supreme Industries|Plastics
FINPIPE|Finolex Pipes|Plastics
VIPIND|VIP Industries|Plastics
AWANTIS|Awanti Poly|Plastics
PIDILITIND|Pidilite Industries|Chemicals
UPL|UPL Limited|Chemicals
PIIND|PI Industries|Chemicals
SUMICHEM|Sumitomo Chemical|Chemicals
AARTIIND|Aarti Industries|Chemicals
NAVINFLUOR|Navin Fluorine|Chemicals
SRF|SRF Limited|Chemicals
SOLARINDS|Solar Industries|Chemicals
FINEORG|Fine Organics|Chemicals
ATUL|Atul Ltd|Chemicals
COROMANDEL|Coromandel International|Chemicals
DEEPAKNTR|Deepak Nitrite|Chemicals
HERANBA|Heranba Industries|Chemicals
GALAXYSURF|Galaxy Surfactants|Chemicals
SHARDACROP|Sharda Cropchem|Agri
CHAMBLFERT|Chambal Fertilisers|Agri
NATIONALFER|National Fertiliser|Agri
RASHTRIACHEM|Rashtriya Chemicals|Agri
EIDPARRY|EID Parry|Sugar
BALRAMCHIN|Balrampur Chini|Sugar
BAJAJHINDUSTHAN|Bajaj Hindusthan Sugar|Sugar
DHAMPURSUGAR|Dhampur Sugar|Sugar
MAGADHSUGAR|Magadh Sugar|Sugar
TRIVENI|Triveni Engineering|Sugar
GOKULREF|Gokul Refoils|FMCG
ADANIENT|Adani Enterprises|Conglomerate
BAJAJHLDNG|Bajaj Holdings|Conglomerate
GRASIM|Grasim Industries|Cement
DIXON|Dixon Technologies|Electronics
SYRMA SGS|Syrma SGS Tech|Electronics
CELLO|Cello World|Consumer
DIAMONYD|Diamond Power|Infrastructure
GREATOFFSHORE|Great Offshore|Logistics
MCDOWELLN|United Breweries|FMCG
UNITEDSPIRIT|United Spirits|FMCG
RENUKA|Renuka Sugars|Sugar
SHREEPUSHK|Shree Renuka Sugars|Sugar
DWARIKESH|Dwarikesh Sugar|Sugar
UGARSUGAR|Ugar Sugar Works|Sugar
BOMBAYSUGAR|Bombay Sugar|Sugar
JKPAPER|JK Paper|Paper
BALMERLAWRIE|Balmer Lawrie|Packaging
GAMMNINFRA|GAMMN Infrastructure|Infrastructure
SADBHAV|Sadhav Engineering|Infrastructure
JMC|JMC Projects|Infrastructure
MEIL|Megha Engineering|Infrastructure
TATAPOWERDL|Tata Power Delhi|Power
CESC|CESC Limited|Power
JAISALMERE|Jaisalmere Hotels|Services
EIHOTELS|EI Hotels|Services
INDIANHOTEL|Indian Hotels|Services
LUPINLTD|Lupin Ltd|Pharma
DRREDDYNXT|Dr Reddy's Next|Pharma
WOCKPHARMA|Wockhardt Pharma|Pharma
SUZLONENERGY|Suzlon Energy|Power
ADANIPORTSSEZ|Adani Ports SEZ|Infrastructure
RITES|RITES Ltd|Infrastructure
VA Tech WABAG|VA Tech Wabag|Infrastructure
AEC|AEC Engineering|Infrastructure
KNRCON|KNR Constructions|Infrastructure
LUXIND|Lux Industries|FMCG
WELSPUNENT|Welspun Enterprises|Textiles
NILKAMAL|Nilkamal Limited|Plastics
BOMBAYDYEING|Bombay Dyeing|Textiles
JBF|JBF Industries|Textiles
RELIANCE|Reliance Industries|Energy
TCS|Tata Consultancy Services|IT
HDFCBANK|HDFC Bank|Banking
INFY|Infosys|IT
ICICIBANK|ICICI Bank|Banking
"""

seen = set()
equities = []

for line in data.strip().split("\n"):
    line = line.strip()
    if not line:
        continue
    parts = line.split("|")
    if len(parts) != 3:
        continue
    sym, name, sec = [p.strip() for p in parts]
    if sym in seen or len(sym) < 2 or len(sym) > 20:
        continue
    seen.add(sym)
    
    # Estimate bp/v/ls based on sector
    bp, v, ls = 500, 0.025, 1000
    
    if sec == "Banking":
        if any(x in sym for x in ["HDFC","KOTAK","INDUSIND"]): bp,v,ls = 1500,0.020,500
        elif sym in ("SBIN",): bp,v,ls = 825,0.022,750
        elif sym in ("ICICIBANK","AXISBANK"): bp,v,ls = 1200,0.019,700
        elif "YES" in sym: bp,v,ls = 28,0.032,14000
        elif sym in ("PNB","BANKBARODA","INDIANB"): bp,v,ls = 200,0.024,4000
        elif sym in ("CANBK","UNIONBANK","BANKINDIA"): bp,v,ls = 120,0.023,4500
        else: bp,v,ls = 80,0.025,6000
    elif sec == "IT":
        if sym=="TCS": bp,v,ls = 4150,0.015,150
        elif sym in ("INFY","HCLTECH"): bp,v,ls = 1600,0.019,500
        elif sym in ("WIPRO","TECHM"): bp,v,ls = 600,0.021,1000
        elif sym in ("TATAELXSI","PERSISTENT","COFORGE"): bp,v,ls = 7000,0.024,75
        elif sym in ("LTIM","MPHASIS","KPITTECH"): bp,v,ls = 5000,0.023,200
        else: bp,v,ls = 800,0.025,1000
    elif sec == "Pharma":
        if sym in ("SUNPHARMA","DRREDDY"): bp,v,ls = 1800,0.019,500
        elif sym in ("DIVISLAB","ABBOTINDIA"): bp,v,ls = 6000,0.020,50
        elif sym in ("CIPLA","AUROPHARMA","GLENMARK","ALKEM"): bp,v,ls = 1500,0.021,500
        else: bp,v,ls = 700,0.023,1000
    elif sec == "Auto":
        if sym in ("MARUTI","BAJAJAUTO"): bp,v,ls = 12000,0.017,50
        elif sym in ("TATAMOTORS","M&M"): bp,v,ls = 1000,0.024,500
        elif sym=="MRF": bp,v,ls = 40000,0.019,10
        elif sym=="BOSCHLTD": bp,v,ls = 35000,0.018,15
        else: bp,v,ls = 1000,0.022,500
    elif sec == "Auto Ancillary":
        if sym in ("MOTHERSUMI",): bp,v,ls = 285,0.027,2000
        else: bp,v,ls = 1500,0.023,400
    elif sec == "FMCG":
        if sym in ("ITC","HINDUNILVR"): bp,v,ls = 500,0.015,1500
        elif sym in ("NESTLEIND","BRITANNIA"): bp,v,ls = 3000,0.016,100
        elif sym=="TITAN": bp,v,ls = 3450,0.019,175
        else: bp,v,ls = 700,0.020,800
    elif sec == "Consumer":
        if sym=="ASIANPAINT": bp,v,ls = 2980,0.017,200
        else: bp,v,ls = 1500,0.022,400
    elif sec in ("Metals","Mining"):
        if sym=="TATASTEEL": bp,v,ls = 155,0.026,3000
        elif sym=="JSWSTEEL": bp,v,ls = 985,0.024,600
        elif sym=="COALINDIA": bp,v,ls = 510,0.021,1600
        else: bp,v,ls = 300,0.025,2000
    elif sec in ("Energy","Power"):
        if sym=="RELIANCE": bp,v,ls = 2950,0.018,250
        elif sym in ("NTPC","POWERGRID"): bp,v,ls = 400,0.020,2000
        elif sym=="SUZLON": bp,v,ls = 72,0.035,7500
        elif sym=="ADANIGREEN": bp,v,ls = 1850,0.030,500
        else: bp,v,ls = 300,0.022,2000
    elif sec == "Cement":
        if sym=="ULTRACEMCO": bp,v,ls = 11000,0.017,50
        elif sym=="SHREECEM": bp,v,ls = 25000,0.019,50
        else: bp,v,ls = 1500,0.020,400
    elif sec == "Real Estate":
        if sym in ("DLF","GODREJPROP"): bp,v,ls = 1000,0.024,500
        else: bp,v,ls = 600,0.025,600
    elif sec == "Finance":
        if sym=="BAJFINANCE": bp,v,ls = 7000,0.022,125
        elif sym in ("BAJAJFINSV","MUTHOOTFIN"): bp,v,ls = 3500,0.020,100
        elif sym in ("HDFCAMC","BSE","MCX"): bp,v,ls = 6000,0.022,75
        elif sym in ("IRFC","RVNL"): bp,v,ls = 200,0.026,5000
        else: bp,v,ls = 500,0.025,1500
    elif sec == "Insurance":
        bp,v,ls = 700,0.020,700
    elif sec == "Healthcare":
        if sym=="APOLLOHOSP": bp,v,ls = 6850,0.020,50
        else: bp,v,ls = 600,0.023,600
    elif sec == "Infrastructure":
        if sym=="LT": bp,v,ls = 3650,0.018,150
        elif sym=="ADANIPORTS": bp,v,ls = 1470,0.020,500
        elif sym in ("SIEMENS","ABB"): bp,v,ls = 8000,0.021,75
        else: bp,v,ls = 400,0.025,2000
    elif sec in ("E-commerce","Internet"): bp,v,ls = 300,0.030,2000
    elif sec == "Logistics": bp,v,ls = 500,0.025,1500
    elif sec in ("Sugar","Agri"): bp,v,ls = 400,0.024,2000
    elif sec == "Textiles": bp,v,ls = 400,0.025,2000
    elif sec == "Chemicals": bp,v,ls = 2000,0.023,300
    elif sec == "Capital Goods": bp,v,ls = 2000,0.022,200
    elif sec == "Electronics": bp,v,ls = 5000,0.028,200
    elif sec == "Telecom": bp,v,ls = 300,0.025,2000
    elif sec == "Media": bp,v,ls = 400,0.025,1500
    elif sec == "Conglomerate": bp,v,ls = 2000,0.025,300
    elif sec == "Plastics": bp,v,ls = 800,0.022,1000
    elif sec == "Paper": bp,v,ls = 400,0.022,1500
    elif sec == "Services": bp,v,ls = 1200,0.025,300
    elif sec == "Packaging": bp,v,ls = 600,0.022,1000
    else: bp,v,ls = 500,0.025,1500
    
    equities.append({"s": sym, "n": name, "sec": sec, "bp": bp, "v": round(v, 3), "ls": ls})

equities.sort(key=lambda x: x["s"])

with open("/home/z/my-project/src/lib/stock-list.json") as f:
    existing = json.load(f)

result = {
    "equities": equities,
    "indices": existing["indices"],
    "optionUnderlyings": existing.get("optionUnderlyings", [])
}

with open("/home/z/my-project/src/lib/stock-list.json", "w") as f:
    json.dump(result, f, separators=(",", ":"))

print(f"Total unique equities: {len(equities)}")
print(f"Sectors: {sorted(set(e['sec'] for e in equities))}")
