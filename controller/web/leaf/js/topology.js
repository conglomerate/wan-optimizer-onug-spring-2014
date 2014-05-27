// Topology.js
// Helpers and d3 viz to draw topology of a network

// TODO: add intelligent displacement code for flow link ends (so we can draw arrows at the target!)
// TODO(MAYBE): host coloring: shade each host at the same switch slightly different.

// hack in usage of equals to test object equality in indexOf for arrays, original code courtesy of MDN
// this won't be necessary if we don't use objects to denote nodes in FDG
Array.prototype.indexOf = function ( searchElement , fromIndex ) {
  var i,
      pivot = ( fromIndex ) ? fromIndex : 0,
      length;

  if ( !this ) {
    throw new TypeError();
  }

  length = this.length;

  if ( length === 0 || pivot >= length ) {
    return -1;
  }

  if ( pivot < 0 ) {
    pivot = length - Math.abs( pivot );
  }

  for ( i = pivot; i < length; i++ ) {
    if ( this[i].equals && this[i].equals( searchElement ) ) { // HACK here
      return i;
    } else if ( this[i] === searchElement ) {
      return i;
    }
  }
  return -1;
};

// call this in app
initTopology = function() {
  // enum-likes
  DRAWING_STYLE = {
    STATIC_CIRCULAR: 0,
    FDG_LINE: 1,
    FDG_ARC: 2,
  }

  LINK_TYPE = {
    PHYSICAL: 0,
    FLOW: 1
  }

  // globals
  lastResizeStamp = null;

  fdg = null; //d3 force directed graph model
  svg = null; //svg display canvas (svg DOM node)
  tips = {
    node: d3.tip()
            .attr( "class", "d3-tip" )
            .offset( [ -10, 0 ] )
            .html( function( n ) {
          if (n.nodeType=="host") {
            var loc = getLocation(n,currentDB);
            return prettyPrintMac( n.id ) +
                "<br/><span class='strong'>" + n.nodeType + "</span>" +
                "<span style='display: block; text-align: center;'>@port: " + loc.port + "</span>";
          } else {
            return prettyPrintMac( n.id ) + "<br/><span class='strong'>" + n.nodeType + "</span>";
          }
      } )
  }

  currentDB = { switchLinks: [], hostLocs: [], flows: [] }; // as received from Server.
  currentTopology = { switches: [], links: [], hosts: [], hostLocs: [] }; //FDG topology model
  currentFlows = [];

  vibrant = [ "#999", "#1EA1E5", "#D91354", "#1CB684", "#6096F8", "#FA9E15" ]; //nice colors

  eth_type_ip = 2048;

  showHosts = false;
  showFlows = false;
  showAllFlows = false;
  showMulticast = false;
  selectedSwitches = [];
  selectedHostLocations = [];
  showSelect = false;
  showIPOnly = false;
    isStopped = false;

  drawingStyle = DRAWING_STYLE.FDG_LINE;

  serverEventSrc = new EventSource('/event');

  serverEventSrc.addEventListener('message', function (msg) {
    if ( topologyTimerId == null ) { // don't respond to events when we've deinited
      displayTopoFromController();
    }
  }, false);

  // visualization resize code
  $( "#viz" ).width( $( window ).width() );
  $( "#viz" ).height( getMaxVizHeight() );
  $( window ).resize( function() {
    // lock resizing to at most 30 times per second
    var now = ( new Date ).getTime()
    if ( lastResizeStamp && now - lastResizeStamp < 33 ) return;
    // resize to fit window
    $( "#viz" ).width( $( window ).width() );
    $( "#viz" ).height( getMaxVizHeight() );
    fdg.stop();
    svg.attr( "width" , $( "#viz" ).width() )
      .attr( "height", getMaxVizHeight() )
    fdg.size( [ $("#viz").width(), getMaxVizHeight() ] );
    fdg.resume();
    lastResizeStamp = now;
  } );
}

deinitTopology = function() {
  clearInterval( topologyTimerId );
  topologyTimerId = null;
  fdg.stop();
  fdg = null;
  svg = null;
  currentDB = {};
  currentTopology = {};
  currentFlows = [];
  tips = null;
  serverEventSrc.close();
  serverEventSrc = null;
}

toggleStop = function () {
    if (isStopped) {
	fdg.start();
	isStopped = false;
    } else {
	fdg.stop();
	isStopped = true;
    }
}

toggleShowIP = function() {
    showIPOnly = !showIPOnly;
    if (!isStopped) { fdg.stop(); }
    updateForceDirectedLinkDistance();
    if (!isStopped) { fdg.start(); }
    rebuildFlowOverlay( currentFlows, currentTopology.links );
}

toggleShowSelect = function() {
    showSelect = !showSelect;
    if (!isStopped) { fdg.stop(); }
    updateForceDirectedLinkDistance();
    if (!isStopped) { fdg.start(); }
    rebuildFlowOverlay( currentFlows, currentTopology.links );
}

toggleSelectedFlows = function(topology, d) {

    if (d.nodeType == "host") {
	var loc = getLocation(d,topology)
	var ix = -1;
	for (var i = 0; i < selectedHostLocations.length; i++) {
	    if (_.isEqual(selectedHostLocations[i], loc)) {
		ix = i;
		break;
	    }
	}
	if (ix == -1) {
	    selectedHostLocations.push(loc);
	} else {
	    selectedHostLocations.splice(ix,1);
	}
	// selectedHostLocations.push(loc);
	// alert(JSON.stringify(getLocation(d,topology)));
    }

    if (d.nodeType == "switch") {
	var ix = selectedSwitches.indexOf(d.id);
	if (ix == -1) {
	    selectedSwitches.push(d.id);
	} else {
	    selectedSwitches.splice(ix,1);
	}
    }
    if (!isStopped) { fdg.stop(); }
    updateForceDirectedLinkDistance();
    if (!isStopped) { fdg.start(); }
    rebuildFlowOverlay( currentFlows, currentTopology.links );
}

toggleMulticast = function() {
    showMulticast = !showMulticast
    if (!isStopped) { fdg.stop(); }
    updateForceDirectedLinkDistance();
    if (!isStopped) { fdg.start(); }
    rebuildFlowOverlay( currentFlows, currentTopology.links );
}

toggleShowFlows = function () {
    showFlows = !showFlows;
    if (!isStopped) { fdg.stop();} 
    updateForceDirectedLinkDistance();
    if (!isStopped) { fdg.start();}
    rebuildFlowOverlay( currentFlows, currentTopology.links );
}

toggleShowHosts = function () {
    showHosts = !showHosts;
    if (!isStopped) { fdg.stop();} 
    rebuildTopo( currentTopology );
    if (!isStopped) { fdg.start();}
    rebuildFlowOverlay( currentFlows, currentTopology.links ); // force ingress/egress flows to show up
}

setShowAllFlows = function( _showAllFlows ) {

  // update UI
  if ( !_showAllFlows ) {
    $( "#show-flow-active-only" ).addClass( "active" )
    $( "#show-flow-all" ).removeClass( "active" )
  } else {
    $( "#show-flow-all" ).addClass( "active" )
    $( "#show-flow-active-only" ).removeClass( "active" )
  }

  if ( showAllFlows != _showAllFlows ) {
      showAllFlows = _showAllFlows;
      rebuildFlowOverlay( currentFlows, currentTopology.links );
  } else {
    showAllFlows = _showAllFlows;
  }
}

//
// some useful data container prototypes
//

var Switch = function( id ) {
  this.id = id;
  this.nodeType = "switch";
};
Switch.prototype.equals   = function( that )  { return this.nodeType == that.nodeType && this.id == that.id; }
Switch.prototype.toString = function()        { return "sw" + this.id };
Switch.prototype.valueOf  = function()        { return this.id + currentTopology.hosts.length }; // bad static data usage is bad

// usage: var t = new SwitchPortTuple( switchId, portNum ); b.sw; b.port;
var SwitchPortTuple = function( sw, port ) {
  if ( arguments.length != 2 ) {
      console.log( "Warning: SwitchPortTuple only needs sw and port! Resulting object will be undefined.")
  }

  this.sw   = sw;
  this.port = port;
  this.nodeType = "swpt";
};
SwitchPortTuple.prototype.equals   = function( that ) { return this.nodeType == that.nodeType && this.sw == that.sw && this.port == that.port; }
SwitchPortTuple.prototype.toString = function()       { return "sw" + this.sw + " p" + this.port }

// TODO: implement rudimentary inheritance or composition (share nodeType as a component for swpt, switch and host) as described in Eloquent Javascript
var Host = function( id ) {
  this.id = id;
  this.nodeType = "host";
};
Host.prototype.equals   = function( that )  { return this.type == that.type && this.id == that.id; }
Host.prototype.toString = function()        { return "h" + this.id };
Host.prototype.valueOf  = function()        { return this.id };

// usage: var l = new SwitchPortTuple( swpt1, swpt2 ); l.source; l.target;
var Link = function( s, t, linkType, cap, flow, flipped, FDGSource, FDGTarget, FDGLinknum ) {
  this.s = s;
  this.t = t;

  if ( linkType == undefined || flow == undefined ) {
    this.linkType = LINK_TYPE.PHYSICAL;
  } else {
    this.linkType = linkType;
    this.flow = flow
  }

  this.cap = cap || 1e9; // assume gigabit bandwidth cap
  this.flipped = flipped || false; // for tracking -- only used (or rather, only SHOULD be used) in getForceCompliantNodesAndLinks
  this.linknum = FDGLinknum || 1;  // again, only used in getForceCompliantNodesAndLinks

  // to play nicely with d3 force layout api; this really shouldn't be necessary
  this.source = FDGSource || s.sw || s;
  this.target = FDGTarget || t.sw || t;
};

Link.prototype.equals = function( that )  {
  if ( this.linkType == that.linkType ) {
    if ( this.linkType == LINK_TYPE.FLOW ) { //directed
      return this.s.equals( that.s ) &&
             this.t.equals( that.t ) &&
             this.flow.flowID == that.flow.flowID &&
             this.linknum == that.linknum;
    } else { //bi-directional
      return ( this.s.equals( that.s ) && this.t.equals( that.t ) ) || ( this.t.equals( that. s ) && this.s.equals( that.t ) );
    }
  }
  return false;
}

Link.prototype.flip = function() {
  return new Link( this.t, this.s, this.linkType, this.cap, this.flow, !this.flipped, this.target, this.source, this.linknum );
}

var Flow = function( flowID, ingressLocation, egressLocations, links, flowRate, isActive, ethType ) {
  this.flowID = flowID;
  this.ingressLocation = ingressLocation;
  this.egressLocations = egressLocations; // this means we must construct links manually in d3 force
  this.links = links;
  this.flowRate = flowRate;
  this.isActive = isActive;
  this.ethType = ethType;
};

//
// D3 draw helpers
//

rebuildFlowOverlay = function( flows, links ) {
  var flowlinks = [];

  if ( showFlows ) {
    flows.map( function( f ) {
      if ( !showAllFlows && !f.isActive) return; // f.flowRate < 0.001 ) return; // arbitrary threshold; only show active flows past this threshold
      if ( f.egressLocations.length > 1 && !showMulticast ) return;
	if ( showSelect) {
	    var flowSwitches = f.egressLocations.map(function(sp) { return sp.switch; });
	    flowSwitches.push(f.ingressLocation.switch);
	    f.links.map(function(link) { 
		flowSwitches.push(link.source.switch);
		flowSwitches.push(link.target.switch);
	    });
	    var b = false;
	    for (var i = 0; i < selectedSwitches.length; i++) {
		if (flowSwitches.indexOf(selectedSwitches[i]) != -1) {
		    b = true;
		}
	    }
	    for (var i = 0; i < selectedHostLocations.length; i++) {
		if (_.isEqual(f.ingressLocation, selectedHostLocations[i])) {
		    b = true;
		}
	    }
	    // alert(JSON.stringify(selectedSwitches) + " ---- " + JSON.stringify(flowSwitches) + " = " + b);
	    if (!b) return;
	}
	if (showIPOnly && (f.ethType != eth_type_ip)) return;
      // for each link specified by the flow, push it to the master list of links
      f.links.forEach( function( l ) {
        flowlinks.push( new Link( new Switch( l.source.switch, l.source.port ),
                                  new Switch( l.target.switch, l.source.port ),
                                  LINK_TYPE.FLOW,
                                  l.cap,
                                  f ) );
      } );

      if ( showHosts ) {
        var ingressLocation = new SwitchPortTuple( f.ingressLocation.switch, f.ingressLocation.port );
        if ( getHostFromEdgePort( ingressLocation, links ) ) {
          flowlinks.push( new Link( getHostFromEdgePort( ingressLocation, links ),
                                    new Switch( ingressLocation.sw ),
                                    LINK_TYPE.FLOW,
                                    undefined,
                                    f ) );
        }

        f.egressLocations.forEach( function( edgePort ) {
          var egressLocation = new SwitchPortTuple( edgePort.switch, edgePort.port );
          if ( getHostFromEdgePort( egressLocation, links ) ) {
            flowlinks.push( new Link( new Switch( egressLocation.sw ),
                                      getHostFromEdgePort( egressLocation, links ),
                                      LINK_TYPE.FLOW,
                                      undefined,
                                      f ) );
          }
        } );
      }
    } );
  }

  updateFlows( flowlinks );
}

rebuildTopo = function( topology ) {
  //make copies of everything so we can edit it
  var links = [], hosts = [], switches = [];

  topology.switches.map( function( sw ) { switches.push( sw ); } );

  if ( !showHosts ) {
    topology.links.map( function( l ) {
      if ( l.s.nodeType != "host" && l.t.nodeType != "host" )
        links.push( l );
    } );
  } else {
    // this could use some work: I can clarify my intent here: forEach or map?
    topology.hosts.forEach( function( h ) { hosts.push( h ); } );
    topology.links.forEach( function( l ) { links.push( l ); } );
  }

  if ( fdg == null || svg == null ) {
    svg = buildTopoScaffold();

    // init d3 fdg model
    var graph = getForceCompliantNodesAndLinks( links, switches, hosts );

    fdg = d3.layout.force()
      .nodes( graph.nodes )
      .links( graph.links )
      .size( [ $("#viz").width(), getMaxVizHeight() ] )
      .charge( -2000 )
      .on( "tick", tick )
      .start();
  }

  // boilerplate code to bind visualizations to fdg (and add/delete any new/old data)
  updateForceDirectedGraph( links, switches, hosts, topology );
}

getForceCompliantNodesAndLinks = function( links, switches, hosts ) {
  // assign source and target of links to the reference of the actual Switch instance
  // at the same time, reconstruct switches array by inferring from links
  nodes = [];

  // get a node (Switch or Host) from one end of a link. Notably, it applies a SwitchPortTuple->Switch mapping
  function getNode( n ) {
      switch ( n.nodeType ) {
        case "swpt":
          for ( var i = 0; i < switches.length; i++ )
            if ( switches[i].id == n.sw )
              return switches[ i ];
          break;
        case "host": return n;
        case "switch": return n;
      }
  }

  // convenient syntactic sugar: self-explanatory
  function clone( n ) {
    switch ( n.nodeType ) {
      case "switch": return new Switch( n.id );
      case "swpt": return new SwitchPortTuple( n.sw, n.port );
      case "host": return new Host( n.id );
    }
  }

  // build a list of nodes from links
  links.forEach( function( link ) {
    if ( !nodes.some( function exists( n ) {
      if ( n.equals( getNode( link.s ) ) ) {
        link.source = n;
	  //side-effect! Refactor!
	  // It's not clear what I'm doing here
	  // ( link.source must be set to one of the elements in node for d3's fdg to work)
        return true;
      }
      return false;
    } ) ) {
      link.source = clone( getNode( link.s ) );
      nodes.push( link.source );
    }

    if ( !nodes.some( function exists( n ) {
      if ( n.equals( getNode( link.t ) ) ) {
        link.target = n;  //side-effect!
        return true;
      }
      return false;
    } ) ) {
      link.target = clone( getNode( link.t ) );
      nodes.push( link.target );
    }
  } );

  // fill in disconnected switches and hosts
  switches.forEach( function ( sw ) {
    if ( !nodes.some( function exists( n ) { return n.equals( sw ); } ) ) {
      nodes.push( clone( sw ) );
    }
  } );

  hosts.forEach( function ( host ) {
    if ( !nodes.some( function exists( n ) { return n.equals( host ); } ) ) {
      nodes.push( clone( sw ) );
    }
  } );

  // start augmenting links with linknum

    // list flows by pair; use buckets.Dictionary data structure.
    // Must provide toString() method for the keys, or else most keys will map to same string.
    var flowDict = new buckets.Dictionary(JSON.stringify);

  // add field 'linknum' for duplicate links (same source and target)
  for ( var i=0; i < links.length; i++ ) {
      var key = { s:links[i].source, t:links[i].target, linkType: links[i].linkType};
      var count = flowDict.get(key);
      if (!count) { count = 1; }
      flowDict.set(key, count + 1);
//      if (links[i].linkType == LINK_TYPE.FLOW) {
      links[i].linknum = count;
//      } else {
//	  links[i].linknum = 1;
//      }
//      alert(links[i].linknum);
  }

  for ( var i=0; i < links.length; i++ ) {
      // when drawing, flip to other side (groups flows going in the same direction)
      links[i].flipped = links[i].linkType == LINK_TYPE.FLOW && links[i].source < links[i].target;
  }

  return { links: links, nodes: nodes };
}

// take an edge port (switch port tuple) and return the connected hose, if applicable
// returns false otherwise
getHostFromEdgePort = function( swpt, links ) {
  for ( var i = 0; i < links.length; i++ ) {
    var link = links[i];
    if ( link.s.equals( swpt ) && link.t.nodeType == "host" ) {
      return link.t;
    }

    if ( link.t.equals( swpt ) && link.s.nodeType == "host" ) {
      return link.s;
    }
  }

  return false;
}

getLocation = function(host, topology) {
//    alert(JSON.stringify(host));
 for (var i = 0; i < topology.hostLocs.length; i++) {
  var hostLoc = topology.hostLocs[i];
  if (hostLoc.host == host) {
   return { switch: hostLoc.switch, port: hostLoc.port };
  }
 }
 return null;
}

// get the color in increments of up to 360 / numSwitches ( this means we should always have enough colors to choose from )
// unfortunately, this also means that colors will change with each new switch...every time we get a new switch, update the color for ALL switches.
getSwitchColor = function( sw, topology ) {
  var index = topology.switches.indexOf( sw );
  var incr_candidates = [ 30, 15, 10, 5, 3, 2, 1 ];
  var incr = incr_candidates.reduce( function selectBestIncr( prev, cur ) { // choose the nearest lower neighbor to 360 / numswitches
    return 360 / ( topology.switches.length ) > prev ? prev : cur;
  } );
  return chroma.hsv( ( index % 2 == 0 ? index * incr : 180 + index * incr ), 0.6, 1.0 ).hex();
}

// Host gets the same color as the switch that it attaches to.
getHostColor = function( host, hosts, topology ) {
    var loc = getLocation(host, topology);
    return chroma( getSwitchColor(new Switch(loc.switch), topology) ).saturate().darken();
}

// take host and returns the connected edge switch, if applicable
// returns false otherwise
getEdgeSwitch = function( host, links ) {
  for ( var i = 0; i < links.length; i++ ) {
    var link = links[i];
    if ( link.source.equals( host ) && link.target.nodeType == "switch" ) {
      return link.target;
    }

    if ( link.target.equals( host ) && link.source.nodeType == "switch" ) {
      return link.source;
    }
  }
  return false;
}

// if an equivalent node exists in fdg.nodes(), return that
mapToFDGNode = function( node ) {
  for ( var i = 0; i < fdg.nodes().length; i++ ) {
    if ( fdg.nodes()[i].equals( node ) ) {
      return fdg.nodes()[i]
    }
  }
  console.log("Fatal error: node not found, this should never happen. We need this node: " );
  console.log( node );
  return false;
}

// we need to update the link distances on every change of topo (and flow toggle)
// because it is only evaluated once
updateForceDirectedLinkDistance = function() {
  fdg.linkDistance( function( link ) {
    var showFlowsMultiplier = showFlows ? 2.0 : 1.0; // expand the graph when showing flows; makes it less scrunched-up
    if ( link.source.nodeType == "host" || link.target.nodeType == "host" )
      return 50 * showFlowsMultiplier;
    else
      return 100 * showFlowsMultiplier; // the more switches and hosts, the shorter the link
  } )
}

// flows are updated separately from the topology, because we don't want flow changes to
// rebuild the entire topology
updateFlows = function( flowlinks ) {
  var flowDict = new buckets.Dictionary( JSON.stringify ); // temporary, used to build up linknums

  flowlinks.forEach( function( l ) {
    var key = { s:l.source, t:l.target };
    var count = flowDict.get( key );
    if ( !count ) count = 1;
    flowDict.set( key, count + 1 );
    l.linknum = count;

    l.source = mapToFDGNode( l.source );
    l.target = mapToFDGNode( l.target );
  } );

  var flowpaths = svg.select( "#links" ).selectAll( ".flow" )
    .data( flowlinks );

  flowpaths.enter().insert( "svg:path" )
    .attr( "class", "flow" )
    .attr( "marker-end", function(d) { return ""; });

  tick(); // d3 stops calling tick if the graph remains "dormant" for some time. This is especially noticeable when flow is not a part of the FDG. So we must forcibly invoke tick()

  flowpaths.exit().remove();
}

// only call update if not the same topology -- invariant: the old topology still exists in currentTopology
// and will not be updated until this function finishes executing
updateForceDirectedGraph = function( links, switches, hosts, topology ) {
  if ( fdg == null ) return;
  var graph = getForceCompliantNodesAndLinks( links, switches, hosts );

  fdg.stop();

  // remove unused nodes
  for ( var i = 0; i < fdg.nodes().length; i++ ) {
    var oldnode = fdg.nodes()[i];
    if ( !graph.nodes.some( function exists( newnode ) { return newnode.equals( oldnode ); } ) ) {
      fdg.nodes().splice( i, 1 );
      i--;
    }
  }

  // add new nodes
  graph.nodes.forEach( function( newnode ) {
    if ( !fdg.nodes().some( function exists( oldnode ) { return oldnode.equals( newnode ); } ) ) {
      fdg.nodes().push( newnode );
    }
  } );

  // remove unused links
  for ( var i = 0; i < fdg.links().length; i++ ) {
    var oldlink = fdg.links()[i];
    if ( !graph.links.some( function exists( newlink ) { return newlink.equals( oldlink ); } ) ) {
      fdg.links().splice( i, 1 );
      i--;
    }
  }

  // add new links
  graph.links.forEach( function( newlink ) {
    if ( !fdg.links().some( function exists( oldlink ) { return oldlink.equals( newlink ); } ) ) {
      fdg.links().push( newlink );
    }
  } );

  fdg.links().forEach( function( l ) {
    l.source = mapToFDGNode( l.source );
    l.target = mapToFDGNode( l.target );
  } );

  updateForceDirectedLinkDistance();
  fdg.start();

  svg.selectAll( "marker" )
      .data( [ "flow-direction" ] )
    .enter().append("svg:marker")
      .attr( "id", String )
      .attr( "class", "mid" )
      .attr( "viewBox", "0 -5 10 10" )
      .attr( "refX", 0 )
      .attr( "refY", 0 )
      .attr( "markerWidth", 1 )
      .attr( "markerHeight", 1 )
      .attr( "orient", "auto" )
    .append( "svg:path" )
      .attr( "d", "M0,-5L10,0L0,5" );

  // add or remove new links (note that physical links and flow links are separated)
  var physpaths = svg.select( "#links" ).selectAll( ".physical" )
    .data( fdg.links() );

  physpaths.enter().insert( "svg:path" )
    .attr( "class", "physical" )
    .attr( "marker-end", function(d) { return ""; });

  physpaths.exit()
    .each( function( d, index ) {
      if ( d.source.nodeType == "host" ) {
        // reset edge switch color
        d3.select( "#switch" + d.target.id )
        .attr( "fill", function( sw ) { return getSwitchColor( sw, topology ) } );
      }

      if ( d.target.nodeType == "host" ) {
        // reset edge switch color
        d3.select( "#switch" + d.source.id )
        .attr( "fill", function( sw ) { return getSwitchColor( sw, topology ) } );
      }
    } )
    .remove();

var nodes = svg.select( "#nodes" ).selectAll( ".node" )
    .data( fdg.nodes(), function( node ) { return node.toString(); } );

  nodes.enter()
      .append( "g" )
      .attr( "class", "node" )
	.on( "click", function(d) { if (d3.event.shiftKey) { toggleSelectedFlows(topology, d);} })
      .on( "mouseover", function( d ) { if ( !d.fixed ) tips.node.show( d ); } ) // show tooltip on mouseover, but not on mousedrag; d.fixed is 0 when we're not dragging the node ( see d3.v3.js:5842 )
      .on( "mouseout", tips.node.hide ) // hide tooltip on mouseout always
      .on( "mousedown", function( d ) {
        event.stopPropagation(); // ugh. do not propagate the mousedown event further up the DOM tree; this will prevent the zoom event from firing.
      } )
      .each( function( d, index ) {
        // first, create the necessary circle
        d3.select( this )
          .append( "svg:circle" )
          .attr( "class", function( d ) { return d.nodeType } )
          .attr( "r", function( d ) { return d.nodeType == "switch" ? 20 : d.nodeType == "host" ? 15 : 10 } );

        // now update ALL node colors
        d3.selectAll( "g.node" ).each( function( d, index ) {
          d3.select( this )
            .select( "circle" )
            .attr( "fill", function( d ) {
              return d.nodeType == "switch" ? getSwitchColor( d, topology ) : d.nodeType == "host" ? "#fff" : "#000";
            } )
            .attr( "stroke", function( d ) {
              return d.nodeType == "host" ? getHostColor( d, hosts, topology ) : chroma( getSwitchColor( d, topology ) ).brighten( 30 );
            } );
        } );
      } )
      .call( fdg.drag )
  nodes.exit()
      .each( function( d, index ) {
          switch ( d.nodeType ) {
            case "host":
              // reset edge switch color
              if ( getEdgeSwitch( d, fdg.links() ) ) {
                d3.select( "#switch" + getEdgeSwitch( d, fdg.links() ).id )
                .attr( "fill", function( sw ) { return getSwitchColor( sw, topology ) } );
              }
            break;
          }

      } )
      .remove();

  var text = svg.select( "#labels" ).selectAll( "text" ).data( fdg.nodes() );

  text.enter()
    .append( "svg:text" )
    .attr( "x", function( d ) { return d.nodeType == "host" ? -5 : -5; } )
    .attr( "y", ".31em" )
    .attr( "fill", function( d ) { return d.nodeType == "host" ? getHostColor( d, hosts, topology ): "#fff"; } )
    .style( "visibility", "hidden" )
    .text( function(d) { return d.nodeType.charAt( 0 ).toUpperCase(); } );

  text.exit().remove();
}

// rebuilds the topology canvas (svg); if one existed before, remove it
buildTopoScaffold = function() {
  d3.select( "svg" ).remove(); // clean

  // define zoom (and pan) behavior
  var zoom = d3.behavior.zoom()
    .center( [ $("#viz").width() / 2, getMaxVizHeight() / 2 ] )
    .scaleExtent( [ 0.3, 3 ] )
    .on( "zoom", function() {
      var scale = zoom.scale(); // this is nice.
      var trans = zoom.translate();

      // in d3's default scale: Bottom right = 0 0, top left = -w -h
      // this is so strange!
      /*
      console.log( ( trans[0] - canvas_data.WIDTH / 2 )  / scale );
      console.log( ( trans[1] - canvas_data.HEIGHT / 2 ) / scale );
      */

      // rescale all the groups. Create a new group and put everything in there.
      svg.select( "#links" ).attr( "transform", "translate( " + trans + " ) scale(" + scale + ")" );
      svg.select( "#nodes" ).attr( "transform", "translate( " + trans + " ) scale(" + scale + ")" );
      svg.select( "#labels" ).attr( "transform", "translate( " + trans + " ) scale(" + scale + ")" );
     } );

  // rebuild svg node
  var svg = d3.select("body").select("center").append("svg")
    .attr( "width" , $( "#viz" ).width() )
    .attr( "height", getMaxVizHeight() )
    .call( zoom );

  // build links group (empty)
  svg.append("svg:g").attr( "id", "links" );
  // build node group (empty)
  svg.append( "svg:g" ).attr( "id", "nodes" );
  // build label group (empty)
  svg.append( "svg:g" ).attr( "id", "labels" );

  // set up tooltips
  svg.call( tips.node );

  return svg;
}

function tick() {
  var path = svg.select( "#links" ).selectAll( ".physical, .flow" );

  // returns the corresponding "d" attribute for an svg path
  // given a link, draw a line with an offset based on its linknum property
  drawStraightLine = function( link ) {
    shift = function( x1, y1, x2, y2, shiftDist, isEndPoint ) {
      var mp = y2 - y1 == 0 ? 0 : - ( x2 - x1 )/( y2 - y1 );

      // determine total distance away from the first line (flip dist signs; otherwise the lines criss-cross)
      var r = ( link.linknum % 2 == 0 ? -1 : 1 ) * ( isEndPoint ? -1 : 1 ) * ( ( link.linknum / 2 ) >> 0 ) * shiftDist ;

      var theta = Math.atan( mp );
      if ( mp > 0 ) {
        return { x: x1 + ( x2 > x1 ? -Math.cos( theta ) * r : Math.cos( theta ) * r ),
                 y: y1 + ( y2 > y1 ? Math.sin( theta ) * r : -Math.sin( theta ) * r ) };
      } else if ( mp < 0 ) {
        return { x: x1 + ( x2 > x1 ? Math.cos( theta ) * r : -Math.cos( theta ) * r),
                 y: y1 + ( y2 > y1 ? Math.sin( theta ) * r : -Math.sin( theta ) * r ) };
      } else if ( x2 == x1 ) {
        return { x: x1, y: y1 + ( y2 > y1 ) ? r : -r };
      } else if ( y2 == y1 ) {
        return { x: x1 + ( x2 > x1 ) ? r : -r,  y: y1 };
      }
    }

    var src_shifted = shift( link.source.x, link.source.y, link.target.x, link.target.y, 5, false ),
        dst_shifted = shift( link.target.x, link.target.y, link.source.x, link.source.y, 5, true );

    return "M" + src_shifted.x + "," + src_shifted.y + " L" + dst_shifted.x + "," + dst_shifted.y;
  }

  // given a source and target point (having x and y properties), get the midpoint and displace it perpendicularly.
  subdivideAndDisplace = function( source, target, displacement ) {
    // we should use a vector library for this!
    var dir = { x: target.x - source.x, y: target.y - source.y };
    var perp = { x: dir.y, y: -dir.x };
    var length = Math.sqrt( perp.x * perp.x + perp.y * perp.y );
    var perp = { x: perp.x / length, y: perp.y / length }; //normalize

    var mid = { x: source.x + dir.x / 2, y: source.y + dir.y / 2 }; //midpoint of path
    return { x: mid.x + perp.x * displacement, y: mid.y + perp.y * displacement };
  }

  // returns the corresponding "d" attribute for an svg path
  // given a link, draw a quadratic bezier with two ctrl points and one midpoint based on its linknum property
  // the reason we need five points is so we can attach an arrow in the middle of the curve
  drawQuadraticBezier = function( link ) {
    var mid = subdivideAndDisplace( link.source, link.target, link.linknum  * 20 );
    var ctrl1 = subdivideAndDisplace( link.source, mid, link.linknum * 10 ); // between src and mid
    var ctrl2 = subdivideAndDisplace( mid, link.target, link.linknum * 10 ); // between mid and target
    return "M" + link.source.x +
           "," + link.source.y +
           "Q" + ctrl1.x +
           "," + ctrl1.y +
           " " + mid.x +
           "," + mid.y +
           " " + ctrl2.x +
           "," + ctrl2.y +
           " " + link.target.x +
           "," + link.target.y;
  }

  // returns the corresponding "d" attribute for an svg path
  // given a link, draw a quadratic bezier with two ctrl points and one midpoint based on its linknum property
  // the reason we need five points is so we can attach an arrow in the middle of the curve
  drawQuadraticBezier2 = function( link ) {
      var mid = subdivideAndDisplace( link.source, link.target, (link.linknum - 1)  * 8 );
      var ctrl1 = subdivideAndDisplace( link.source, mid, (link.linknum - 1) * 4 ); // between src and mid
      var ctrl2 = subdivideAndDisplace( mid, link.target, (link.linknum - 1) * 4 ); // between mid and target
    return "M" + link.source.x +
           "," + link.source.y +
           "Q" + ctrl1.x +
           "," + ctrl1.y +
           " " + mid.x +
           "," + mid.y +
           " " + ctrl2.x +
           "," + ctrl2.y +
           " " + link.target.x +
           "," + link.target.y;
  }

  // returns the corresponding "d" attribute for an svg path
  // given a link, draw an arc based on its linknum property
  drawArc = function( link ) {
    var dx = link.target.x - link.source.x,
        dy = link.target.x - link.source.y,
        dr = Math.sqrt( ( dx * dx + dy * dy ) / 2 * link.linknum ),
        sweep = link.linknum % 2; //flip the arc
    return "M" + link.source.x +
           "," + link.source.y +
           "A" + dr +
           "," + dr +
           " 0 0, " + sweep + link.target.x + "," + link.target.y;
  }

  path.attr( "d", function(d) {
    switch ( drawingStyle ) {
      case DRAWING_STYLE.FDG_LINE:
        if ( d.linkType == LINK_TYPE.PHYSICAL ) return drawQuadraticBezier2(d); //drawStraightLine( d );
        else if ( d.linkType == LINK_TYPE.FLOW ) return drawQuadraticBezier( d );
      break;

      case DRAWING_STYLE.FDG_ARC:
        if ( d.linkType == LINK_TYPE.PHYSICAL ) return drawArc( d ); //hmm
        else if ( d.linkType == LINK_TYPE.FLOW ) return drawArc( d );
        break;
    }
  } )
  .attr( "stroke", function( d ) {
    if ( d.linkType == LINK_TYPE.FLOW ) {
      return vibrant[ ( d.flow.flowID ) % vibrant.length ];
    } else {
      return vibrant[ ( d.linknum - 1 ) % vibrant.length ];
    }
  } ) //change colors
  .attr( "stroke-width", function( d ) {
      return d.linkType == LINK_TYPE.FLOW ? Math.sqrt( d.flow.flowRate / d.cap ) * 8.0 + 5.0 : 1.5
  } )
  .attr( "stroke-opacity", function( d ) {
      return d.linkType == LINK_TYPE.FLOW ? Math.sqrt( d.flow.flowRate / d.cap ) * 0.7 + 0.3 : 1.0
  } )
  .attr( "fill", "transparent" )
  .attr( "marker-mid", function( d ) {
      return d.linkType == LINK_TYPE.FLOW ? "url(#flow-direction)" : "";
  } ); // draw arrows on flows

  svg.selectAll( "g.node" ).attr( "transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  });

  svg.selectAll( "text" ).attr( "transform", function(d) {
    return "translate(" + d.x + "," + d.y + ")";
  });
}

displayTopo = function ( switchlinks, hostlocs, flows ) {
  var db = { switchLinks: switchlinks, hostLocs: hostlocs, flows: flows };
  if ( _.isEqual( currentDB, db ) ) {
   return;
  }

  var newTopology = { switches: [], links: [], hosts: [], hostLocs: hostlocs };
  var newFlows = { flows: [], flowlinks: [] };

  switchlinks.nodes.map(function( item ) { newTopology.switches.push( new Switch( item.name ) ); } );

  switchlinks.links.map(function( link ) {
    var s = new SwitchPortTuple( link.source, link.sourceport );
    var t = new SwitchPortTuple( link.target, link.targetport );
    var link = new Link( s,t );
    if ( !newTopology.links.some( function exists( l ) { return l.equals( link ); } ) ) {
      newTopology.links.push( link );
    }
  } );

  hostlocs.map( function( loc ) {
    var host = new Host( loc.host );
    newTopology.hosts.push( host );
    var s = new SwitchPortTuple( loc.switch, loc.port );
    newTopology.links.push( new Link( s, host ) );
  } );

  flows = flows.map( function( fl ) {
      return new Flow( fl.flowID, fl.ingressLocation, fl.egressLocations, fl.links, fl.flowRate, fl.isActive, fl.ethType );
  } );

  var o1 = { switchLinks: currentDB.switchLinks, hostLocs: currentDB.hostLocs };
  var o2 = { switchLinks: switchlinks, hostLocs: hostlocs };
  if ( !( _.isEqual( o1, o2 ) ) ) {
    rebuildTopo( newTopology );
  }
  if ( showFlows && !_.isEqual( currentFlows, flows ) ) {
    rebuildFlowOverlay( flows, newTopology.links );
  }

  currentFlows = flows;
  currentDB = db;
  currentTopology = newTopology;
}

displayTopoFromController = function () {
  d3.json( "/topology", function(error, switchlinks ) {
    if (error) return console.warn( error );
    d3.json( "/hostlocations", function( error, hostlocs ) {
      if ( error ) return console.warn( error );
      d3.json( "/flows", function( error, flows ) {
        if ( error ) return console.warn( error );
        displayTopo( switchlinks, hostlocs, flows );
      })
    })
  });
}
periodicallyUpdate = function () {
  topologyTimerId = setInterval( displayTopoFromController, 1000 );
}
changeDrawingStyle = function( style ) {
  if ( drawingStyle != style ) {
    drawingStyle = style;
    rebuildTopo( currentTopology );
  }
}

// helper; only works for topology at the moment
getMaxVizHeight = function() {
    return  $( window ).height() - $( "header" ).outerHeight( true ) - 15; //15px of fudge offset
}
