# -*- coding: utf-8 -*-

## library Imports
import json, sys, os, time, argparse, logging
import shapely

import pandas as pd
import numpy as np
try:
    import urllib.request as url   # python 3
except:
    import urllib2 as url  # python 2

###### OD Matrix ######
def CreateODMatrix(infile, infile_2, lat_name = 'Lat', lon_name = 'Lon', UID = 'ID', 
                    Pop = None, call_type = 'OSRM', rescue = 0, rescue_num = 0, MB_Token = '', 
                    sleepTime = 5, osrmHeader = ''):
    """
    make sure lat_name and Lon_names are the same column names in both your infile (origins) and infile_2 (destinations)
    :param infile: string for folder path containing input data of the origins. This can also be a geodataframe of the data instead.
    :param infile_2: string for folder path containing input data of the destinations. This can also be a geodataframe of the data instead.
    :param lat_name: Latitude column name.
    :param lon_name: Longitude column name
    :param UID:   Origin Unique Identifier column name (e.g. District, Name, Object ID...). This is mainly helpful for joining the output back to the input data / a shapefile, and is non-essential in terms of the calculation. It can be text or a number.
    :param Pop: Population / weighting column name
    :param call_type: Server call type - "OSRM" for OSRM, "MB" for Mapbox, "MBT" for Mapbox traffic, or "Euclid" for Euclidean distances (as the crow flies)
    :param MB_Token: Mapbox private key if using the "MB" or "MBT" call types
    """     
        
    # Function for performing Euclidian distances.
    def EuclidCall(source_list,dest_list,source_points,dest_points):
            distmatrix = np.zeros((len(source_points),len(dest_points)))
            for s in range(0,len(source_points)):
                    for d in range(0,len(dest_points)):
                            # 100 included as normalisation factor to MapBox / OSRM results
                            distmatrix[s,d] = (source_points[s].distance(dest_points[d])*100)
            df = pd.DataFrame(data = distmatrix,
                                    columns = dest_list,
                                    index = source_list)
            df = df.stack(level =-1)
            df.columns = ['O','D','DIST']
            return df
    
    # Function for calling OSRM server.
    def Call(O_list, D_list, i, O_IDs, D_IDs, header):
        # Convert origins to HTTP request string
        Os = ';'.join(str(coord).replace("'", "").replace(";", "") for coord in O_list)
        # Destinations to HTTP request string
        Ds = ';'.join(str(coord).replace("'", "").replace(";", "") for coord in D_list)
        # Join them together
        data = Os+';'+Ds

        # Define which coords in data string are origins, and which are destinations
        sources = ['%d' % x for x in range(0,len(O_list))]
        sources = ';'.join(str(x).replace("'", "") for x in sources)
        lenth = len(O_list)+len(D_list)
        destinations = ['%d' % x for x in range(len(O_list),lenth)]
        destinations = ';'.join(str(x).replace("'", "") for x in destinations)

        # Add mapbox token key here
        if not call_type == 'OSRM':
            print(f"call type is {call_type}")
            token = MB_Token
            # Build request string
            request = header+data+'?sources='+sources+'&destinations='+destinations+'&access_token='+token
        else:
            # Build request string
            request = header+data+'?sources='+sources+'&destinations='+destinations
            
        # Pass request to interweb
        try:
            r = url.urlopen(request)
        except:
            print(request)
            time.sleep(5)
            r = url.urlopen(request)
            
        # Error handle
        try:
            # Convert Bytes response to readable Json
            MB_TelTest_json = json.loads(r.read().decode('utf-8'))
            data_block = MB_TelTest_json['durations']
        except:
            data_block = 'null'

        # Build df from JSON
        #sources_label = [str(i['location']) for i in MB_TelTest_json['sources']]
        #dest_label = [str(i['location']) for i in MB_TelTest_json['destinations']]
        sources_label = O_IDs
        dest_label = D_IDs
        chunk = pd.DataFrame(data = data_block, columns = dest_label, index = sources_label)
        # Convert to minutes, stack 2D array to 1D array
        chunk = chunk.stack(level =-1)
        chunk.columns = ['O','D','DIST']
        return(chunk)

    # Generate appropriately split source and destination lists
    def split_and_bundle(in_list,break_size):
        new_list = []
        for i in range (0,(int(max(len(in_list)/break_size,1)))):
            upper = (i+1) * break_size
            lower = (upper - break_size)
            objs = in_list[lower:upper]
            new_list.append(objs)
        if len(in_list) > break_size:
            rem = len(in_list) % break_size
            if rem > 0:
                final = upper+rem
                new_list.append(in_list[upper:final])
        return new_list

    # Save settings
    save_rate = 5
    def save(returns, j, i, numcalls, rescue_num):
        elapsed_mins = (time.time() - start)/60
        elapsed_secs = (time.time() - start)%60
        total = ((numcalls / float(i)) * (time.time() - start)/60.0)
        remaining = total - elapsed_mins
        print ('\n______________________________________\n')
        print ('\nSave point %s. Running for: %d minutes %d seconds' % (j, elapsed_mins, elapsed_secs))
        print ('\ncalls completed: %d of %d. Est. run time: %d minutes. Time remaining: %d' % (i-1, numcalls, total, remaining))
        print ('\npercentage complete: %d percent' % (((i-1) / float(numcalls)*100)))
        print ('\n______________________________________\n')
        try:
            df = pd.concat(returns)
        except:
            df = returns
        curOutput = os.path.join(ffpath,'temp_file_%d.csv' % rescue_num)
        df.to_csv(curOutput)

    # If infile is a string path
    if isinstance(infile, str):
        ffpath = os.path.dirname(infile)
        start = time.time()
        print('\nChosen server: %s\n\nStart time: %s' % (call_type, time.ctime(start)))
        print('Origins: %s' % infile)
        print('Destinations: %s\n' % infile_2)

        # File Import for sources file
        input_df = pd.read_csv(infile)
        input_df2 = pd.read_csv(infile_2)
    else:
        input_df = infile
        input_df2 = infile_2

    input_df['source_list'] = input_df[lon_name].map(str).str.cat(input_df[lat_name].map(str), sep = ',')
    input_df['source_list'] = input_df['source_list']+';'
    source_list = input_df['source_list'].values.tolist()
    source_UIDs = input_df[UID].values.tolist()
    #input_df['source_point'] = input_df.apply(lambda x: Point(x[lon_name],x[lat_name]), axis = 1)
    #source_points = input_df['source_point'].tolist()

    # Look to import separate file for destinations; if not, set destinations = sources
    input_df2['dest_list'] = input_df2[lon_name].map(str).str.cat(input_df2[lat_name].map(str), sep = ',')
    input_df2['dest_list'] = input_df2['dest_list']+';'
    dest_list = input_df2['dest_list'].values.tolist()
    dest_UIDs = input_df2[UID].values.tolist()           

    if call_type == 'MBT' :
        sources_list = split_and_bundle(source_list, 5)
        dests_list = split_and_bundle(dest_list, 5)
        sources_UIDs = split_and_bundle(source_UIDs, 5)
        dests_UIDs = split_and_bundle(dest_UIDs, 5)
    elif call_type == 'MB' or call_type == 'OSRM':
        sources_list = split_and_bundle(source_list, 12)
        dests_list = split_and_bundle(dest_list, 13)
        sources_UIDs = split_and_bundle(source_UIDs, 12)
        dests_UIDs = split_and_bundle(dest_UIDs, 13)
    else:
        pass
            
    # Run function call across the O-D matrix; output is 'df'
    returns = []
    numcalls = (len(sources_list) * len(dests_list))
    print(f"length of sources list {len(sources_list)}, and destinations list is {len(dests_list)}")
    #s, d = sources_list, dests_list
    i, j = 1 + (rescue * len(sources_list)), 1 + rescue

    ### Making Calls 
    if call_type == 'Euclid':
        df = EuclidCall(source_list,dest_list,source_points,dest_points)
    else:
        if rescue > 0:
            s = s[rescue:] # possibly rescue -1
            sources_UIDs = sources_UIDs[rescue:]
        print('source list: %s' % len(source_list))
        print('sources list: %s' % len(sources_list))
        print('dest list: %s' % len(dest_list))
        print('dests list: %s' % len(dests_list))
        numcalls_rem = (len(source_list) * len(dest_list))
        print('\nEstimated remaining calls to chosen server: %d\n' % numcalls_rem)
        print('save points will occur every %d calls\n' % (len(dests_list)))
        if sleepTime > 0:
            time.sleep(sleepTime)
        for O_list in sources_list:
            O_IDs = sources_UIDs[sources_list.index(O_list)]
            for D_list in dests_list:  
                print("1 iteration")                  
                if sleepTime > 0:
                    time.sleep(sleepTime)
                D_IDs = dests_UIDs[dests_list.index(D_list)]
                if call_type == 'MB':
                    # https://docs.mapbox.com/api/navigation/matrix/
                    header = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving/'
                elif call_type == 'MBT':
                    header = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/'
                elif call_type == 'OSRM':
                    header = 'http://router.project-osrm.org/table/v1/driving/'
                    if osrmHeader != '':
                        header = osrmHeader
                try:
                    # prevent server annoyance
                    print('Call to OSRM server number: %d of %s' % (i, numcalls_rem))                
                    returns.append(Call(O_list,D_list,i,O_IDs,D_IDs, header))
                    print('done with call')
                    i += 1
                    j += 1
                except:
                    logging.warning("Error Processing OSRM for i:%s and j:%s" % (i, j))
                    save(returns, j, i, numcalls, rescue_num)
        try:
            df = pd.concat(returns)
        except:
            df = returns

    # re-attach the population of origins and destinations, prep dataframe
    if Pop:
        all_matrices = []
        if rescue_num > 0:
            for r in range(0,rescue_num):
                rescued_matrix = pd.read_csv(os.path.join(ffpath,'temp_file_%d.csv' % (r)),header=None)
                rescued_matrix.columns = ['O_UID','D_UID','DIST']
                all_matrices.append(rescued_matrix)
        df = df.reset_index()
        df.columns = ['O_UID','D_UID','DIST']
        all_matrices.append(df)
        new = pd.concat(all_matrices)

        try:
            new = new.set_index('O_UID')
            new['DIST'] = new['DIST'].apply(pd.to_numeric)
            popdf = input_df[[UID,Pop]].set_index(UID)
            new['O_POP'] = popdf[Pop]
            new = new.reset_index()
            new = new.set_index('D_UID')
            if dest_list == source_list:
                new['D_POP'] = popdf[Pop]
                new = new.reset_index()
            else:
                popdf_dest = input_df2[[UID,Pop]].set_index(UID)
                new['D_POP'] = popdf_dest[Pop]
                new = new.reset_index()
            new['O_UID'] = new['O_UID'].astype(str)
            new['D_UID'] = new['D_UID'].astype(str)
            new['combo'] = new['O_UID']+'_X_'+new['D_UID']
            new = new.drop_duplicates('combo')
            new = new.drop(['combo'], axis = 1)
            return new
        except:
            print("Something went wrong with processing population information, returning results without population results")
            return new
    else:
        return df

def MarketAccess(new, lambder_list = 
                   [0.01,
                    0.005,
                    0.001,
                    0.0007701635,   # Market access halves every 15 mins
                    0.0003850818,   # Market access halves every 30 mins
                    0.0001925409,   # Market access halves every 60 mins
                    0.0000962704,   # Market access halves every 120 mins
                    0.0000385082,   # Market access halves every 300 mins
                    0.00001]
                    ):
    """
    Calculate Market Access for a given range of lambdas
    """

    # Run market access for all lambda across 'new' dataframe
    output = pd.DataFrame()
    new = new.loc[new['DIST'] > -1]
    def market_access(x,lambdar):
        return sum(x.D_POP*np.exp(-lambdar*x.DIST))
    for lamdar in lambder_list:
        output["%s_%s" % ('d', lamdar)] = new.loc[new['DIST'] > 0].groupby('O_UID').apply(lambda x:market_access(x,lamdar))

    return output

      
def ReadMe(ffpath):
    readmetext = ("""
        GOST: Market Access: Product Assumptions

        Last Updated: 26 Jul 2018
        Programmer: C. Fox
        Theory: K. Garrett, T. Norman

        This GOST Market Access product is based off of:
                - Mapbox's Matrix API for travel times;
                - OSRM's API for travel times

        Travel Time Calculation

        The Mapbox Matrix API provides estimated trip durations in seconds.
        The time it takes to travel from one point to another is determined by a
        number of factors, including:
        - The profile used (walking, cycling, or driving); (GOST: set to driving)
        - The speed stored in the maxspeed tag in OpenStreetMap
          (https://wiki.openstreetmap.org/wiki/Key:maxspeed)
        - Traffic derived from real-time telemetry data, provided by Mapbox

        Traffic data

        In addition to the contributions of OpenStreetMap, Mapbox SDKs collect
        anonymous data, or telemetry, about devices using their services to continuously
        update their routing network. Attributes such as speed, turn restrictions, and
        travel mode can be collected to improve OpenStreetMap.

        Advanced - Speed Assumptions

        See https://github.com/Project-OSRM/osrm-backend/blob/master/docs/profiles.md
        For a full explanation of profiles, and how speeds are calculated across segments

        Note on API request timings

        Requests using mapbox/driving, mapbox/walking, and mapbox/cycling profiles
        can specify up to 25 input coordinates per request. Requests using the
        mapbox/driving-traffic profiles can specify up to 10 input coordinates per request.

        Requests using mapbox/driving, mapbox/walking, and mapbox/cycling profiles
        have a maximum limit of 60 requests per minute. Requests using the
        mapbox/driving-traffic profiles have a maximum of 30 requests per minute.

        Algorithm flags

        Commands recognised for this script:
        -p   Path - string for input and output folder path
        -f   File name of .csv containing input data
        -m   Latitude column name.
        -n   Longitude column name
        -o   Origin Unique Identifier column name (e.g. District, Name, Object ID...).
             This is mainly helpful for joining the output back to the input data / a shapefile,
             and is non-essential in terms of the calculation. It can be text or a number.
        -q   Population / weighting column name
        -c   Server call type - "OSRM" for OSRM, "MB" for Mapbox, "MBT" for Mapbox traffic, or "Euclid" for Euclidean distances (as the crow flies)
        -l   Limit - use this to limit the coordinate input list (int). Optional.

        *** Optional - if sources =/= destinations. Note - Unique identifier and Pop column names must remain the same ***
        -W   Filename of destinations csv
        *** Optional - if encountering server errors / internet connectivity instability ***
        -R   Save - input latest save number to pick up matrix construciton process from there.
        -Z   Rescue number parameter - If you have already re-started the download process, denote how many times. First run = 0, restarted once = 1...
        Do NOT put column names or indeed any input inside quotation marks.
        The only exceptions is if the file paths have spaces in them.
        """)

    text_file = open(os.path.join(ffpath,"GOST_ReadMe_MarketAccess.txt"), "w")
    text_file.write(readmetext)
    text_file.close()

    
if __name__ == "__main__":
    exampleText = '''
    ##### Run OD Matrix only #####
    python OD.py -od -s C:/Temp/sources.csv -d C:/Temp/destinations.csv -outputOD C:/Temp/OD.csv
    
    # Run MA only
    python OD.py -ma -matrix C:/Temp/MatrixRes.csv -outputMA C:/Temp/MA_Res.csv
    
    # Run Both Analyses
    python OD.py -all -s C:/Temp/sources.csv -d C:/Temp/destinations.csv -outputMA C:/Temp/MA_Res.csv -outputOD C:/Temp/OD.csv
    '''
    parser = argparse.ArgumentParser(description="Calculate Origin Detination",
        epilog=exampleText, formatter_class=argparse.RawDescriptionHelpFormatter)
    
    parser.add_argument('-all', dest="ALL", action='store_true', help="Set if you want to run both OD Matrix Calculation and Market Access")
    parser.add_argument('-od', dest="OD", action='store_true', help="Run OD Matrix calculation only")
    parser.add_argument('-ma', dest="MA", action='store_true', help="Run Market Access Calculation")
    
    parser.add_argument('-s', dest="SOURCES_FILE", action='store', help="Sources Points as CSV")
    parser.add_argument('-d', dest="DESTINATION_FILE", action='store', help="Destination Points as CSV")
    parser.add_argument('-matrix', dest='MATRIX_FILE', action='store', help="if running only market access, define Matrix csv here")
    
    parser.add_argument('-outputOD', dest='OD_FILE', action='store', help="Output csv for OD Matrix")
    parser.add_argument('-outputMA', dest='MA_FILE', action='store', help="Output csv for market access results")
    
    parser.add_argument('--lat', dest='LAT_NAME', action='store', default='Lat', help="Name of Latitude coordinates in both sources and dests")
    parser.add_argument('--lon', dest='LON_NAME', action='store', default='Lon', help="Name of Longitude coordinates in both sources and dests")
    parser.add_argument('--id', dest='UID', action='store', default='ID', help="unique identifier used in both sources and dests")
    parser.add_argument('--Pop', dest='POPFIELD', action='store', default='Pop', help="Field in input files defining population for sources and destinations")
    parser.add_argument('--osrm', dest='OSRMHEADER', action='store', default='', help="optional parameter to set OSRM source")
    parser.add_argument('--sleep', dest='SLEEPTIME', action='store', default=3, help="When making calls to OSRM, a sleep time is required to avoid DDoS")
    
    args = parser.parse_args()
    
    if args.ALL or args.OD:
        #Create OD Matrix        
        odRes = CreateODMatrix(args.SOURCES_FILE, args.DESTINATION_FILE, 
                       lat_name=args.LAT_NAME, lon_name=args.LON_NAME, Pop=args.POPFIELD,
                       UID=args.UID, osrmHeader=args.OSRMHEADER, sleepTime=float(args.SLEEPTIME))
        if args.OD_FILE:
            odRes.to_csv(args.OD_FILE)
        
    if args.ALL or args.MA:
        #Create Market Access
        if args.MATRIX_FILE:
            odRes = pd.read_csv(args.MATRIX_FILE)
        output = MarketAccess(odRes)
        output.to_csv(args.MA_FILE)
