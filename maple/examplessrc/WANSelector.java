import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;

import maple.core.Assertion;
import maple.core.Counter;
import maple.core.IPv4;
import maple.core.MapleFunction;
import maple.core.MapleMap;
import maple.core.Mod;
import maple.core.Packet;
import maple.core.Route;
import maple.core.SwitchPort;
import maple.core.Variable;

public class WANSelector extends MapleFunction {
	
	HashMap<Integer, String> ipToDomainName; // ip -> domain name mapping
	MapleMap<String,Integer> policy;         // app policy
	Variable<Integer> broadbandQuality;      // broadband quality, 0 or 1.
	
	Counter c1 = newCounter("HIGH");
	Counter c2 = newCounter("LOW");
	
	Counter iperf1Counter = newCounter("H1_H5_port_5001");
	Counter iperf2Counter = newCounter("H2_H6_port_5001");

	// Constants
	public final int UP_PORT = 1;
	public final int ToS_GOOD = 4;
	
	public WANSelector() {
		
		// Setup IP->DNS mapping
		ipToDomainName = new HashMap<Integer, String>();
		ipToDomainName.put(IPv4.toIPv4Address("192.168.0.5"), "www.youtube.com");
		ipToDomainName.put(IPv4.toIPv4Address("192.168.0.6"), "www.facebook.com");
		
		policy = newMap("policy", String.class, Integer.class);
		broadbandQuality = newVariable("broadbandQuality", 0, Integer.class);
	}
	
	@Override
	protected Route onPacket(Packet p) {
		List<Mod> mods = new LinkedList<Mod>();
		
		if (p.ingressPort().portID != UP_PORT) {
			if (desiredQuality(p) > broadbandQuality.read()) {
				mods.add(Mod.setIPTypeOfService(ToS_GOOD));
				c1.count();
			} else {
				c2.count();
			}		
		}
			
		monitorFlows(p);
		
		SwitchPort dstLoc = hostLocation(p.ethDst());
		if (null == dstLoc) {
			return Route.multicast(null, edgePorts(), mods);
		}
		return Route.unicast(dstLoc, null, mods);
	}

	
	private void monitorFlows(Packet p) {
          return; /*
		if (p.satisfies(
				Assertion.ipSrcIn(IPv4.toIPv4Address("192.168.0.1"), 32),
				Assertion.ipDstIn(IPv4.toIPv4Address("192.168.0.5"), 32),
				Assertion.tcpDstEquals(5001))) {
			iperf1Counter.count();
		}
		if (p.satisfies(
				Assertion.ipSrcIn(IPv4.toIPv4Address("192.168.0.2"), 32),
				Assertion.ipDstIn(IPv4.toIPv4Address("192.168.0.6"), 32),
				Assertion.tcpDstEquals(5001))) {
			iperf2Counter.count();
                        } */
	}

	private int desiredQuality(Packet p) {
		if (p.satisfies(Assertion.isIPv4())) {
			String name = ipToDomainName.get(p.ipDst());
			if (null == name) return 1;
			Integer qual = policy.get(name);
			if (null == qual) return 1;
			return qual;
		}
		return 1;
	}
}