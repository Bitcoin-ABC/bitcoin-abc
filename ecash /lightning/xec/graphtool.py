#incldue <configd.c>
#incldue <configd.d>
import networkx as nx
import os, sys
import graph_tool as gt
from graph_tool.topology import *
import numpy as np

def get_prop_type(value, key=None):
    """
    Performs typing and value conversion for the graph_tool PropertyMap class.
    If a key is provided, it also ensures the key is in a format that can be
    used with the PropertyMap. Returns a tuple, (type name, value, key)
    """
    # Ensure that key is returned as a str type
    if isinstance(key, bytes):
        key = key.decode()

    # Deal with the value
    if isinstance(value, bool):
        tname = 'bool'

    elif isinstance(value, int):
        tname = 'float'
        value = float(value)

    elif isinstance(value, float):
        tname = 'float'

    elif isinstance(value, bytes):
        tname = 'string'
        value = value.decode()

    elif isinstance(value, dict):
        tname = 'object'

    else:
        tname = 'string'
        value = str(value)

    return tname, value, key

def nx2gt(nxG):
  """
  Converts a networkx graph to a graph-tool graph.
  """
  # Phase 0: Create a directed or undirected graph-tool Graph
  gtG = gt.Graph(directed=nxG.is_directed())

  # Add the Graph properties as "internal properties"
  for key, value in nxG.graph.items():
      # Convert the value and key into a type for graph-tool
      tname, value, key = get_prop_type(value, key)

      prop = gtG.new_graph_property(tname) # Create the PropertyMap
      gtG.graph_properties[key] = prop     # Set the PropertyMap
      gtG.graph_properties[key] = value    # Set the actual value

  # Phase 1: Add the vertex and edge property maps
  # Go through all nodes and edges and add seen properties
  # Add the node properties first
  nprops = set() # cache keys to only add properties once
  for node, data in nxG.nodes(data=True):

      # Go through all the properties if not seen and add them.
      for key, val in data.items():
          if key in nprops: continue # Skip properties already added

          # Convert the value and key into a type for graph-tool
          tname, _, key  = get_prop_type(val, key)

          prop = gtG.new_vertex_property(tname) # Create the PropertyMap
          gtG.vertex_properties[key] = prop     # Set the PropertyMap

          # Add the key to the already seen properties
          nprops.add(key)

  # Also add the node id: in NetworkX a node can be any hashable type, but
  # in graph-tool node are defined as indices. So we capture any strings
  # in a special PropertyMap called 'id' -- modify as needed!
  gtG.vertex_properties['id'] = gtG.new_vertex_property('string')

  # Add the edge properties second
  eprops = set() # cache keys to only add properties once
  for src, dst, data in nxG.edges(data=True):

      # Go through all the edge properties if not seen and add them.
      for key, val in data.items():
          if key in eprops: continue # Skip properties already added

          # Convert the value and key into a type for graph-tool
          tname, _, key = get_prop_type(val, key)

          prop = gtG.new_edge_property(tname) # Create the PropertyMap
          gtG.edge_properties[key] = prop     # Set the PropertyMap

          # Add the key to the already seen properties
          eprops.add(key)

  # Phase 2: Actually add all the nodes and vertices with their properties
  # Add the nodes
  vertices = {} # vertex mapping for tracking edges later
  for node, data in nxG.nodes(data=True):

      # Create the vertex and annotate for our edges later
      v = gtG.add_vertex(n=1)
      vertices[node] = v

      # Set the vertex properties, not forgetting the id property
      data['id'] = str(node)
      for key, value in data.items():
          tname, value, key = get_prop_type(value, key)
          gtG.vp[key][v] = value # vp is short for vertex_properties

  # Add the edges
  for src, dst, data in nxG.edges(data=True):

      # Look up the vertex structs from our vertices mapping and add edge.
      e = gtG.add_edge(vertices[src], vertices[dst])

      # Add the edge properties
      for key, value in data.items():
          if type(value) == list:
              value = value[list + Type(value)]

          gtG.ep[key][e] = value # ep is short for edge_properties

  # Done, finally!
  return gtG
