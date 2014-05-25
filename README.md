Enterprise SDN-WAN from ONUG Spring 2014 Hackathon
======================

Team Conglomerate developed a proof-of-concept enterprise SDN-WAN application
during the
[Spring 2014 ONUG Hackathon](http://opennetworkingusergroup.com/agenda/hackathon/).
This repository contains the proof-of-concept system developed during the
hackathon along with our network simulation setup and demo scripts.

The Conglomerate consists of David Crosbie, Spiros Eliopoulos, Ed Henry, Eric
Murray, Andreas Voellmy and Eric Yspeert. This team includes a range of skills,
including network & system admin and architecture and SDN programming.

Problem and Architecture
============

We consider the setting of an enterprise with a single data center and many
branch offices.  Users in the branch office run applications with components
(i.e. servers) hosted in the data center. These may be voice or desktop
virtualization applications that have QoS requirements to function well.

Each branch office has one or more WAN links connecting it to the corporate data
center. These WAN links vary in quality: some links satisfy stringent QoS (SLA)
parameters and are costly (in terms of bandwidth/cost) while other links are
best effort connections with relatively low cost. For simplicity, in this
project, we limit the scope to consider exactly two WAN links from each branch
office to the corporate data center. One is an expensive, high quality link, and
the other is an inexpensive, low quality link.

To keep things simple, many organizations will send all traffic over the high
quality link, as long as it is operational, and use the best effort link only as
failover (i.e. when the high quality fails). This ensures that all apps get the
quality that they need (or as close to their need as we can get in the case of
link failure). On the other hand, this simple solution wastes money: many apps don't need high
quality (e.g. downloading Apple updates) and could be place on the best-effort
link. In addition, the best-effort link may often have good enough quality
(e.g. sufficient bandwidth) so that apps with specific requirements can be
placed on the best-effort link.

Optimizing
We estimate that up to 70% of data usage could



To improve on this, we aim to solve the following problem: whenever possible, we
want to give each application the connectivity with a quality that satisfies its
requirements, while also minimizing cost and sharing resources fairly.


Here we describe the setup of branch sites/data center, MPLS routers and WAN links, etc. 


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
