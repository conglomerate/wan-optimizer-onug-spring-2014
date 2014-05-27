# Enterprise SDN-WAN App from ONUG Spring 2014 Hackathon

Team Conglomerate developed a proof-of-concept enterprise SDN-WAN application
during the
[Spring 2014 ONUG Hackathon](http://opennetworkingusergroup.com/agenda/hackathon/).
This repository contains the proof-of-concept system developed during the
hackathon along with our network simulation setup and demo scripts.

The Conglomerate consists of David Crosbie, Spiros Eliopoulos, Ed Henry, Eric
Murray, Andreas Voellmy and Eric Yspeert. This team includes a range of skills,
including network & system admin and architecture and SDN programming.

## The SDN-WAN Problem


We consider the setting of an enterprise with a single data center and many
branch offices.  Users in the branch office run applications with components
(i.e. servers) hosted in the data center. These may be voice or desktop
virtualization applications that have QoS requirements.

Each branch office has one or more WAN links connecting it to the corporate data
center. These WAN links vary in quality: some links satisfy stringent QoS (SLA)
parameters and are costly (in terms of bandwidth/cost) while other links are
best effort connections with relatively low cost. For simplicity, in this
project, we limit the scope to consider exactly two WAN links from each branch
office to the corporate data center. One is an expensive, high quality link, and
the other is an inexpensive, low quality link.

To keep things simple, many organizations will send all traffic over the high
quality link, as long as it is operational, and use the best effort link only as
failover (i.e. when the high quality link fails). This ensures that all apps get
the quality that they need (or as close as possible in the event of link
failure). On the other hand, this simple solution is costly: many apps don't
need high quality (e.g. downloading Apple updates) and could be placed on the
less expensive, best-effort link. In addition, the best-effort link may often
have good enough quality (e.g. sufficient bandwidth) to satisfy many apps' QoS
requirements.

Therefore, our goal is to place app traffic on the lowest cost connections
satisfying their QoS requirements (whenever possible) at any given time. We
estimate that up to 70% of an enterprise's WAN data usage may be best effort
traffic. The cost savings from using less expensive links may therefore be
substantial when scaled to enterprises with many branch locations. In addition,
we aim to provide a simple management interface that provides central
configuration and transparent policy distribution. Finally, we aim to collect
application statistics.

## Challenges

In order to route traffic appropriately, the WAN system must have a method to
identify different applications and to determine the QoS requirements for each
application. L2-L4 classification of flows will be tedious for the
administrator, since many web services use a variety of dynamically-changing IP
addresses. Maintaining this configuration over hundreds of sites adds a
substantial burden for network administrators.

The second challenge is to dynamically sense link quality and automatically
re-route WAN traffic based on real-time conditions. Automation is crucial, since
manual administration of routing policy at hundreds of branch offices is
infeasible.

The third challenge is to integrate the new SDN WAN functionality into the
existing branch and data center networks. To ensure realism, we gathered
requirements and constraints from a real enterprise network. In this network, an
MPLS router in each branch and in the data center terminate each of the WAN
connections. The enterprise network imposes a constraint that these MPLS routers
may not be replaced by SDN switches.  See slide 2 in the
[Hackathon presentation](docs/ONUG_hackathon_wan_opt_presentation.pdf) for a
diagram showing the overall architecture of the branch and data center network
with MPLS routers.

## Our Solution

We first configure a simple, static policy-based routing policy on the MPLS edge
routers. This policy forwards packets from the SDN switch and leaving the site
into the WAN links on the basis of the DSCP attribute of IP packets. 

We then replace the core switch (the switch just behind the edge MPLS router,
providing fan out for the local network) in each branch and data center with an
OpenFlow-enabled switch. In addition, we introduce one logical controller per
site to actively control the SDN switch. The SDN system will control the WAN
routing by placing flow rules that mark departing IP packets using the DSCP
field of IP packets to control which link to use (i.e. the markings used in the
static policy-based routing config on the edge routers).

This design allows the SDN WAN application to be deployed without replacing edge
routers. In addition, it enables incremental deployment where individual sites
can be upgraded individually at any time.

The system will have an easy-to-use web application that allows operators to set
application policies. The system will push application policies to each site's
SDN controller.

Applications will be identified by domain name, in addition to L2-L4
attributes. Each SDN controller will dynamically maintain bindings between
domain names and network addresses in order to apply policies. Flow rules in
switches will be dynamically and automatically updated as bindings change.

## Hackathon App

The following sections describe how to run the proof-of-concept app and describes the key elements of the implementation. 

### Preliminaries

We use [vagrant](http://www.vagrantup.com) and [virtualbox](https://www.virtualbox.org) to setup two virtual machines: one to simulate the network and the other to run the site network controllers. You will need to install both of those tools on your system.  You will also need [git](http://git-scm.com).

### Network Simulation

We use [mininet](http://mininet.org) to simulate the network depicted in the slides. The network has one data center and two branch sites. Each branch site is connected to the data center over two connections: one is high quality and low bandwidth (2 Mbps) and the other is low quality and high bandwidth (10 Mbps). Each site has an edge "MPLS" router. Rather than run actual MPLS routers, we use ordinary OVS instances with appropriate static OpenFlow rules to simulate the behavior of the MPLS routers.

We borrow the mininet setup from the [Frenetic project's](http://www.frenetic-lang.org) Vagrant project to simulate the network. To setup the VM, go into `network` and start the VM:

```
cd network
vagrant up
```

When the machine is up, we can start the network. Log in to the machine (by running `vagrant ssh`), and then run

```
sudo python /vagrant/topology.py
```
This script will setup a network like this (names of switches are the mininet names):

| Site        | Edge router | WAN app switch  |
| ------------|-------------|-----|
| Branch 1    | s2 | s1 |
| Branch 2    | s4 | s3 |
| Data center | s6 | s5 |

The branch edge switches (s2 and s4) connect to s6 over two links each. Each WAN app switch is connected to its site's edge router.

Once the mininet prompt is up, we can populate the edge router with a static config using OpenFlow rules that forward outgoing packets based on the DSCP field. To do this, open a second ssh session into the machine (i.e. run `vagrant ssh` in another shell on your host) and run:

```
sudo /vagrant/pe_setup_all
```

Now the network is running, the "edge routers" are configured and the SDN network elements are each waiting to connect to a controller (each waiting for distinct controller).

Please see the scripts (`topology.py` and the `pe_*` scripts) for more details on the topology of the network and other details.

### Controllers

We run one controller per site. Each site using the same control logic, which we wrote using [Maple](http://haskell.cs.yale.edu/wp-content/uploads/2013/08/comm282-voellmy.pdf). To run the controllers, first start up the controller VM:

```
cd controller
vagrant up
```

The controller program is [controller/examplessrc/WANSelector.java](controller/examplessrc/WANSelector.java) (we will explain how it works below). Log in to the machine and do the following to compile the controller:

```
cd /vagrant
ant
```

Now we are ready to run the controller for each site. Log in three times to the controller VM and run the following three scripts: `/vagrant/maple-branch1.sh`, `/vagrant/maple-branch2.sh` and `/vagrant/maple-datacenter.sh`. These scripts start three instances of the controller, with each controller listening on a different port. 

After a few seconds, the three sites' SDN switches should connect to each of the three controllers. Each controller provides a command-line interface (CLI), which you can use to check the attached switches. For example, you should be able to see the following on the shell where you ran `/vagrant/maple-branch.sh`:

```
maple> ports
switch port port-name port-address      capacity (mb/s) status config tx (kb/s) rx (kb/s) utilization
------ ---- --------- ------------      --------------- ------ ------ --------- --------- -----------
1      1    s1-eth1   22:9a:93:5a:19:6d 10000.0         up     []     0.14      0.00      0.00       
1      2    s1-eth2   f2:7e:29:c8:78:1f 10000.0         up     []     0.14      0.00      0.00       
1      3    s1-eth3   0a:f1:97:99:a0:7b 10000.0         up     []     0.14      0.00      0.00       
3 rows
```

Each controller also exposes this over a REST HTTP API (try `curl` to [http://localhost:8000/ports](http://localhost:8000/ports)) and a web GUI (try [http://localhost:8000/maple/maple.html/ports](http://localhost:8000/maple/maple.html/ports)).


### Demo

We now demonstrate the WAN policy GUI and demonstrate the system using generated traffic. More to come here soon...
