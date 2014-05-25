Enterprise SDN-WAN App from ONUG Spring 2014 Hackathon
======================

Team Conglomerate developed a proof-of-concept enterprise SDN-WAN application
during the
[Spring 2014 ONUG Hackathon](http://opennetworkingusergroup.com/agenda/hackathon/).
This repository contains the proof-of-concept system developed during the
hackathon along with our network simulation setup and demo scripts.

The Conglomerate consists of David Crosbie, Spiros Eliopoulos, Ed Henry, Eric
Murray, Andreas Voellmy and Eric Yspeert. This team includes a range of skills,
including network & system admin and architecture and SDN programming.

The SDN-WAN Problem
============

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

Challenges
--

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

Our Solution
-

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
application policies. This system will push application policies to each site's
SDN controller.

Applications will be identified by domain name, in addition to L2-L4
attributes. Each SDN controller will dynamically maintain bindings between
domain names and network addresses in order to apply policies. Flow rules in
switches will be dynamically and automatically updated as bindings change.

Network Simulation
==================

Here we describe how we use mininet (http://mininet.org) to emulate the environment, including instructions on how to start mininet, configure the MPLS routers, etc. 

To simulate the network with Mininet, first install vagrant (http://www.vagrantup.com). Then grab the frenetic project which provides a vagrant project that we will use to run virtual network. To get frenetic, run the following commands:

```
git clone https://github.com/frenetic-lang/frenetic
git checkout 2da8b5b33f9ced6663358f280260f69a9ab04bcc
```

Then copy the scripts directory into frenetic/vagrant, cd into frenetic/vagrant, and run `vagrant up`. (EXPAND AND TEST THIS). When the machine is up, do `vagrant ssh` in two separate sessions, `cd /vagrant` in both. In one, do `sudo python topology.py`. This last command starts the network. Once it is up, run `sudo ./pe_setup_all` in the other terminal. Now the network is running, the "edge routers" are configured and the SDN network elements are each waiting to connect to a controller (each waiting for distinct controller).

Controllers
===========

Here we describe the overall organization of the controllers, how to start them, where to find the source code, how to get to the GUI (web page).

Change into the `maple` directory and run `vagrant up`, then `vagrant ssh` and `cd /vagrant`. Now run `ant` to build all the Maple controllers. Then, to run a controller, you can do `maple -u classes SP`, for example. We discuss how to run the controllers for the WAN optimization demo below. 

Demo
====

Here we describe how to run through the demo that we showed at the hackathon. Describe how to set up the traffic flows, what buttons to push and what should happen in each state.
