import java.util.Timer;
import java.util.TimerTask;

import maple.core.*;

public class SPCounters extends MapleFunction {
	
	Counter c1;
	Counter c2;
	Counter c3;
	Counter c4;
	Timer timer;
	
	public SPCounters() {
		final TimerTask task = new TimerTask() {
			@Override
			public void run() {
				Ethernet frame = Ethernet.arpReply(
						1,
						IPv4.toIPv4Address("10.0.0.1"),
						2L,
						IPv4.toIPv4Address("10.0.0.2"));
				SPCounters.this.sendPacket(frame, edgePorts());
				System.out.println(
						"c1: " + c1.packets() + "; " + c1.bytes() +  
						" c2: " + c2.packets() + "; " + c2.bytes() + 
						" c3: " + c3.packets() + "; " + c3.bytes() + 
						" c4: " + c4.packets() + "; " + c4.bytes()); 
			}
		};
		
		Timer timer = new Timer();
		timer.scheduleAtFixedRate(task, 5000, 5000);
		
		c1 = newCounter("1");
		c2 = newCounter("2");
		c3 = newCounter("3");
		c4 = newCounter("4");
	}
	
	@Override
	protected void onPortStats(SwitchPort loc, PortStats stats) {
		//System.out.println(loc + " " + stats);
	}
	
	@Override
	protected Route onPacket(Packet p) {

		if (p.satisfies(Assertion.ipSrcIn(IPv4.toIPv4Address("10.0.0.1"), 32))) {
			c1.count();
		}
		if (p.satisfies(Assertion.ipSrcIn(IPv4.toIPv4Address("10.0.0.2"), 32))) {
			c2.count(); 
			c4.count();
		}
		if (p.satisfies(Assertion.ipSrcIn(IPv4.toIPv4Address("10.0.0.3"), 32))) {
			c3.count(); 
			c4.count();
		}
		
		
		SwitchPort dstLoc = hostLocation(p.ethDst());
		if (null == dstLoc) {
                  return Route.multicast(minSpanningTree(), edgePorts());
		}
		return Route.unicast(dstLoc, shortestPath(p.ingressPort(), dstLoc));
	}
}
