import maple.core.*;

public class Broadcast extends MapleFunction {
  @Override 
  public Route onPacket(Packet p) {
    return Route.multicast(minSpanningTree(), edgePorts());
  }
}
