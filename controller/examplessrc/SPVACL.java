import maple.core.*;
import static maple.core.Route.*;
import maple.extra.*;
import java.util.LinkedList;
import java.io.*;

import com.google.gson.reflect.*;

public class SPVACL extends MapleFunction {

  Variable<LinkedList<ACRule>> acl;
  Variable<LinkedList<MonitorRule>> monitor;

  public SPVACL() throws FileNotFoundException {
    acl = newVariable("acl", 
                      new LinkedList<ACRule>(), 
                      new TypeToken<LinkedList<ACRule>>() {}.getType()
                      );

    monitor = newVariable("monitor", 
                          new LinkedList<MonitorRule>(), 
                          new TypeToken<LinkedList<MonitorRule>>() {}.getType()
                          );
  }

  @Override
  public Route onPacket(Packet p) {
    ACRule.Action aclAction = ACL.matches(acl.read(),p);
    if (ACRule.Action.DENY == aclAction) return nullRoute;

    LinkedList<SwitchPort> destPorts = new LinkedList<SwitchPort>();

    SwitchPort dstLoc = hostLocation(p.ethDst());
    if (null == dstLoc) { 
      destPorts.addAll(edgePorts());
    } else {
      destPorts.add(dstLoc);
    }

    for (MonitorRule mrule : monitor.read()) {
      if (mrule.predicate.matches(p)) {
        destPorts.addAll(mrule.destinations);
      }
    }

    if (destPorts.size() == 1) {
      return Route.unicast(dstLoc, shortestPath(p.ingressPort(), dstLoc));
    } else {
      return Route.multicast(minSpanningTree(), destPorts);
    }
    
  }
}
