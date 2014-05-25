WAN Optimizer from ONUG Spring 2014 Hackathon
======================

This repository contains the proof-of-concept WAN optimizer application
developed at the [Spring 2014 ONUG Hackathon](http://opennetworkingusergroup.com/agenda/hackathon/). 


Problem and Architecture
============

We consider the setting of an enterprise with a single data center and many
branch offices.  Users in the branch office run applications with components
(i.e. servers) hosted in the data center. These may be voice or desktop
virtualization applications that have QoS requirements to function well.

Each branch office has one or more WAN links used to connect it to the corporate data
center. These WAN links vary in quality: there are some links that ensure
stringent QoS (SLA) parameters and are costly (in terms of bandwidth/cost) while
other links may be best effort connections with relatively low cost.

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
