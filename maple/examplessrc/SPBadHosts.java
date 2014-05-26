import maple.core.*;
import static maple.core.Route.*;

public class SPBadHosts extends MapleFunction {

  public MapleSet<Long> badHosts = newSet("BadHosts", Long.class);

  @Override
  public Route onPacket(Packet p) {

    if (badHosts.contains(p.ethSrc()) || badHosts.contains(p.ethDst())) {
      return nullRoute;
    }

    SwitchPort dstLoc = hostLocation(p.ethDst());
    if (null == dstLoc) {
      return Route.multicast(minSpanningTree(), edgePorts());
    }
    return Route.unicast(dstLoc, shortestPath(p.ingressPort(), dstLoc));
  }

}
