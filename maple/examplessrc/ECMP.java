import maple.core.*;
import static maple.core.Route.*;
import maple.routing.*;
import java.util.List;
import java.util.Set;

public class ECMP extends MapleFunction {

  public Route onPacket(Packet p) {

    SwitchPort srcLoc = hostLocation(p.ethSrc());
    Set<Long> switches = switches();
    Set<Link> links = links();
    Set<SwitchPort> edgePorts = edgePorts();
    Digraph gr = Digraph.unitDigraph(switches, links);
    SwitchPort dstLoc = hostLocation(p.ethDst());

    if (null == dstLoc) { 

      // Destination location unknown, so broadcast everywhere.
      return multicast(gr.minSpanningTree(), edgePorts);

    } else {

      int hash = (int) (p.ethSrc() + p.ethDst());
      List<Link> path = gr.symmetricShortestPath(srcLoc.getSwitch(), dstLoc.getSwitch(), hash);
      return unicast(dstLoc, path);

    }
  }
}
