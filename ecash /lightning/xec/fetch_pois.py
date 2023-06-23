import os, sys, time, logging

import shapely

import geopandas as gpd
import osmnx as ox ### Make sure to install osmnx with -c conda-forge to get newest version
import pandas as pd
import networkx as nx

from shapely.geometry import box
from shapely.geometry import Polygon
from shapely.wkt import loads
from shapely.ops import unary_union

### Definitions

class OsmObject():
    """	
    education = {'amenity':['school', 'kindergarten','university', 'college']}
    health = {'amenity':['clinic', 'pharmacy', 'hospital', 'health']}

    crs = {'init' :'epsg:4326'}
    buf_width = 0.0005

    for a in amenities:
        curr_amenity = amenities[a]
        current = AmenityObject(a, bbox, tags, path)
        current.GenerateOSMPOIs()
        current.RemoveDupes(buf_width, crs)
        current.Save(a)
    """
    
    def __init__(self, a, poly, tags, path=""):
        """
        VARIABLES
        :param a [string]: - name of ammenity
        :param poly [Shapely Polygon]: - area within which to search for POIs
        :param curr_amenity [list of strings]: - list of official OSM features to extract
        :param path [string]: - outFolder where results are saved
        """
        self.tags = tags
        self.name = a
        self.bbox = poly
        self.path = path
    
    def RelationtoPoint(self, string):
        
        lats, lons = [], []

        #It is possible that a relation might be a Polygon instead of a MultiPolygon
        if type(string) == shapely.geometry.polygon.Polygon:
            return string.centroid

        for i in string.geoms:
            lons.append(i.bounds[0])
            lats.append(i.bounds[1])
            lons.append(i.bounds[2])
            lats.append(i.bounds[3])

        point = box(min(lons), min(lats), max(lons), max(lats)).centroid
                
        return point
    
    def GenerateOSMPOIs(self):

        # old way in OSMNX
        # df = ox.pois_from_polygon(polygon = self.bbox, amenities = self.tags)

        # note that even as of Dec, 2020 the code below will be depreciated, as OSMNX deleted the poi modeule in favor of the new geometries module
        #df = ox.pois_from_polygon(polygon = self.bbox, tags = {'amenity':self.current_amenity} )

        df = ox.geometries_from_polygon(self.bbox, self.tags).reset_index()

        print(f"is df empty: {df.empty}")
        if df.empty == True:
            return df
        
        points = df.copy()
        points = points.loc[points['element_type'] == 'node']
        
        polygons = df.copy()
        polygons = polygons.loc[polygons['element_type'] == 'way']
        polygons['geometry'] = polygons.centroid

        multipolys = df.copy()
        multipolys = multipolys.loc[multipolys['element_type'] == 'relation']
        multipolys['geometry'] = multipolys['geometry'].apply(lambda x: self.RelationtoPoint(x))

        df = pd.concat([pd.DataFrame(points),pd.DataFrame(polygons),pd.DataFrame(multipolys)], ignore_index=True)
        
        self.df = df
        return df
    
    def RemoveDupes(self, buf_width, crs = 'epsg:4326'):        
        df = self.df        
        gdf = gpd.GeoDataFrame(df, geometry = 'geometry', crs = crs)        
        if gdf.crs != crs:
            gdf = gdf.to_crs(crs)        
        gdf['buffer'] = gdf['geometry'].buffer(buf_width)        
        l = pd.DataFrame()        
        for i in gdf.index:            
            row = gdf.loc[i]            
            if len(l) == 0:
                #l = l.append(row, ignore_index = True)
                l = pd.concat([l, row.to_frame().T], ignore_index = True)              
            else:
                current_points = unary_union(l['buffer']) 
                if row['buffer'].intersects(current_points):
                    pass                
                else:
                    #l = l.append(row, ignore_index = True)
                    l = pd.concat([l, row.to_frame().T], ignore_index = True)      
        gdf = gdf.to_crs(crs)        
        self.df = l
        return l
                
    def prepForMA(self):
        """
        prepare results data frame for use in the OSRM functions in OD
            1. add Lat and Lon fields
            2. Add unique identifier
            3. remove other geometry fields
        """
        def tryLoad(x):
            try:
                return ([x.x, x.y])
            except:
                return([0,0])
            
        curDF = self.df
        allShapes = [tryLoad(x) for x in curDF.geometry]   
        Lon = [x[0] for x in allShapes]
        Lat = [x[1] for x in allShapes]
        curDF['Lat'] = Lat
        curDF['Lon'] = Lon
        curDF['mID'] = range(0,curDF.shape[0])
        curDF = curDF.drop(['geometry', 'buffer'], axis=1)
        return curDF
    
    def Save(self, outFolder):
        out = os.path.join(self.path, outFolder)
        if not os.path.exists(out):
            os.mkdir(out)
        self.df.to_csv(os.path.join(out, '%s.csv' % self.name), encoding = 'utf -8')
