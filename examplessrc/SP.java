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
		return Route.unicast(dstLoc, shortestPath(hostLocation(p.ethSrc()), dstLoc));
	}
}
