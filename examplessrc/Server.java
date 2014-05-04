
public class Server {
	
	public long macAddress;
	public int ipAddress;

	public Server(long macAddress, int ipAddress) {
		this.macAddress = macAddress;
		this.ipAddress  = ipAddress;
	}

	@Override
	public String toString() {
		return "Server [macAddress=" + macAddress + ", ipAddress=" + ipAddress
				+ "]";
	}
	
}
