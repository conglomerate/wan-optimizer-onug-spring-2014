// Topology.js
// Helpers and cubism viz to time series of link utilization and network throughput (todo)

// global contexts -- can we lambda pass these?

var secsInInterval = 10
var showRelative = false;

// create two contexts so hovering over one doesn't create a cursor on the other
var utilContext = cubism.context()
                        .step( secsInInterval * 1e3 ) // Distance between data points in milliseconds
                        .size( 720 ) // Number of data points (in graph, if overflow, show latest)
                        .serverDelay( 0 )
                        .clientDelay( 0 )
                        .start();

stopUsagePlots = function() {
  utilContext.stop();
}

// grap topology, infer connections, start graph
startUsagePlots = function() {
    d3.select( "body" ).append( "div" ) // Add a vertical rule to the graph
        .attr( "class", "rule" )
        .call( utilContext.rule() );

    d3.json( "/ports", function( error, json ) {
    if ( error ) return console.warn( error );
        drawLinkUtilizationGraphs( json );

        // fix ticker mark on hover

        utilContext.on("focus", function(i) {
            d3.selectAll(".value").style("right", i == null ? null : utilContext.size() - i + "px");
            //ugly fudge code to put vertical rule in the right spot; this seems to be caused Cubism not recognizing Bootstrap offsets
            var offset = d3.select( "#utilization" )[0][0].getBoundingClientRect().left;
            d3.select( d3.selectAll(".line")[0][0] ).style("left", offset + i + "px" ); //there are two lines; only use one of them
        });

    } );
}

// core cubism setup code
initCubismBoilerplate = function( graphName, graphContext ) {

    // add an axis at the top of the charts
    var graph = d3.select( "#" + graphName )
      .append( "div" )
      .attr( "class", "axis" )
      .call( graphContext.axis().orient( "top" ) )

    return graph;
}

//netGraphHeight = 280;

drawLinkUtilizationGraphs = function( ports ) {
    // alert(JSON.stringify(ports.map(function(x) { return x.capacity;})));
    var graph = initCubismBoilerplate( "utilization", utilContext );
    // draw utilization charts
    var cube = utilContext.cube("http://localhost:1081");
    var horizon = utilContext.horizon()
	.title(function(port) { return "sw: " + port.switch + ", pt: " + port.port; })
        .extent(function(port) { if ((null != port.capacity) && showRelative) return [0,1]; else return null; })
	.metric(function(port) {
	    var cap = 1; 
	    if ((null != port.capacity) && showRelative) { cap = secsInInterval * port.capacity * 1000000; }
	    var m1 = cube.metric("8 * sum(portstats(stats.portStatsSentBytes).eq(switch," 
				 + port.switch + ").eq(port," 
				 + port.port + ")) / " + cap);
	    var m2 = cube.metric("8 * sum(portstats(stats.portStatsReceivedBytes).eq(switch,"
				 + port.switch + ").eq(port,"
				 + port.port + ")) / " + cap);
	    var m3 = m1.add(m2);
	    return m3;
	});

    graph.selectAll( ".horizon" )
	.data(ports)
	.enter()
	.insert( "div", ".bottom" )
	.attr( "class", "horizon" )
	.call( horizon
               //.format(d3.format( "+,.3p" ) )   // format to 3 significant digits and use percent (see d3.format)
               // .extent( [ 0, 1 ] )           // set display range of each individual time series
               // .height( myHeight )
	     );

}

var checkboxUtilizationChange = function() {

    showRelative = $("#chk_util")[0].checked;
    stopUsagePlots();
    d3.selectAll(".rule").remove();
    d3.selectAll(".axis").remove();
    d3.select("#utilization").selectAll(".horizon").remove();
    startUsagePlots();

}

var checkboxBytesChange = function () {
    showRelative = !($("#chk_bytes")[0].checked);
    stopUsagePlots();
    d3.selectAll(".rule").remove();
    d3.selectAll(".axis").remove();
    d3.select("#utilization").selectAll(".horizon").remove();
    startUsagePlots();
}