import java.util.List;

import maple.core.Assertion;
import maple.core.Link;
import maple.core.MapleFunction;
import maple.core.Packet;
import maple.core.Route;
import maple.core.SwitchPort;

public class SP extends MapleFunction {
  @Override
  protected Route onPacket(Packet p) {
    SwitchPort dstLoc = hostLocation(p.ethDst());
    if (null == dstLoc) {
      return Route.multicast(minSpanningTree(), edgePorts());
    }
    List<Link> path = shortestPath(hostLocation(p.ethSrc()), dstLoc);
    return Route.unicast(dstLoc, path);
  }
}
