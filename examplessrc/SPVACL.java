import maple.core.*;
import static maple.core.Route.*;
import maple.extra.*;
import java.util.LinkedList;
import java.io.*;

import com.google.gson.reflect.*;

public class SPVACL extends MapleFunction {

  Variable<LinkedList<ACRule>> acl;

  public SPVACL() throws FileNotFoundException {
    acl = newVariable("acl", new LinkedList<ACRule>(), new TypeToken<LinkedList<ACRule>>() {}.getType());
  }

  @Override
  public Route onPacket(Packet p) {
    ACRule.Action aclAction = ACL.matches(acl.read(),p);
    if (ACRule.Action.DENY == aclAction) return nullRoute;

    SwitchPort dstLoc = hostLocation(p.ethDst());
    if (null == dstLoc) {
		return Route.multicast(minSpanningTree(), edgePorts());
	}
	return Route.unicast(dstLoc, shortestPath(hostLocation(p.ethSrc()), dstLoc));
  }
}
