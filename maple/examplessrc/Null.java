import maple.core.*;

public class Null extends MapleFunction {

	@Override
	protected Route onPacket(Packet p) {
		return Route.nullRoute;
	}

}
