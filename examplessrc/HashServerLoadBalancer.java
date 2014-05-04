import static maple.core.Route.multicast;
import static maple.core.Route.unicast;

import java.util.HashSet;
import java.util.LinkedList;

import maple.core.Assertion;
import maple.core.Ethernet;
import maple.core.IPv4Address;
import maple.core.MapleFunction;
import maple.core.Mod;
import maple.core.Packet;
import maple.core.Route;
import maple.core.SwitchPort;

/** 
 * Balance TCP flows to a public virtual server across a collection
 * of actual servers. Uses a hash of the source and destination IP and TCP 
 * addresses to determine the server for a given TCP flow. 
 * The requirements and pseudocode for this load balancer were taken from
 *   http://sdnhub.org/tutorials/app-pseudo-code/
 * To test this, please follow the directions for this example at the same site: 
 *   http://sdnhub.org/resources/useful-mininet-setups/
 *   
 * This code generates ARP replies to ARP queries for the VIP, so there
 * is no need to issue a mininet command to populate the ARP table of
 * hosts that make requests from the VIP (unlike the instructions on the
 * previously mentioned page).
 */
public class HashServerLoadBalancer extends MapleFunction {

	// IP and MAC addresses for Virtual Server
	int vip = IPv4Address.ipAddress("10.0.0.6");
	long vmac = 6L;
	
	// List of servers to load-balance to.
	LinkedList<Server> servers;
	
	// A set containing the MAC addresses of all servers.
	HashSet<Long> serverMacs;
	
	// Initialization
	public HashServerLoadBalancer() {
		servers = new LinkedList<Server>();
		servers.add(new Server(2L, IPv4Address.ipAddress("10.0.0.2")));
		servers.add(new Server(3L, IPv4Address.ipAddress("10.0.0.3")));
		servers.add(new Server(4L, IPv4Address.ipAddress("10.0.0.4")));
		
		serverMacs = new HashSet<Long>();
		for (Server s : servers) { serverMacs.add(s.macAddress); }
	}
	

	
	// Packet handler.
	@Override
	protected Route onPacket(Packet p) {

		if (p.satisfies(Assertion.isARP())) {
			if (p.arpIpTarget() == vip) {
				// ARP request for mac of vip.
				Ethernet frame = Ethernet.arpReply(vmac,vip,p.ethSrc(),p.arpIpSender());
				sendPacket(frame, hostLocation(p.ethSrc()));
			}
		}
		
		long destHost;
		LinkedList<Mod> mods = new LinkedList<Mod>();
		
		if (p.satisfies(Assertion.ipDstIn(vip,32), Assertion.isTCP())) {
			// packets addressed to the public VIP.
			int hash = p.ipSrc() + p.ipDst() + p.tcpSrc() + p.tcpDst();
			int serverIx = hash % servers.size();
			Server server = servers.get(serverIx);
			
			destHost = server.macAddress;
			mods.add(Mod.setEthDst(server.macAddress)); 
			mods.add(Mod.setIPDst(server.ipAddress));

		} else { 
			// Packets not addressed to public VIP 				
			destHost = p.ethDst();
			boolean fromServer = serverMacs.contains(p.ethSrc());
			boolean toServer = serverMacs.contains(p.ethDst());
			if (fromServer && !toServer && p.satisfies(Assertion.isTCP())) {
				// TCP flow from an actual server to outside host.
				mods.add(Mod.setEthSrc(vmac)); 
				mods.add(Mod.setIPSrc(vip));
			} 
		}	
		
		// Route to the desired destination host and apply desired packet mods.
		SwitchPort dstLoc = hostLocation(destHost);
		if (null == dstLoc) {
			return multicast(minSpanningTree(), edgePorts(), mods);
		}
		return unicast(dstLoc, shortestPath(hostLocation(p.ethSrc()), dstLoc), mods);
	}
}