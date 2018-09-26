#!/bin/sh

docker run \
  mount src=`pwd`,target=/workdir,type=bind \
  privileged --name fedora fedora:28 \
  bash -c '
    set -eu;
    export LANG=en_US.UTF-8
    export LC_ALL=en_US.UTF-8
    dnf -y update && dnf install -y flatpak && dnf clean all
    flatpak remote-add flathub https://dl.flathub.org/repo/flathub.flatpakrepo
    flatpak remote-add  nuvola https://dl.tiliado.eu/flatpak/nuvola.flatpakrepo
    flatpak install -y nuvola eu.tiliado.NuvolaAdk//stable > /dev/null
    flatpak install -y nuvola eu.tiliado.NuvolaAdk//master > /dev/null
    echo Done installation
    cd /workdir
    run() {
      branch=$1
      shift
      cmd=$1
      shift
      flatpak run --filesystem=/workdir --command=$cmd eu.tiliado.NuvolaAdk//$branch "$@"
    }
    run stable nuvolasdk check-project
    run stable sh -c "./configure --genuine"
    run stable make all
    run stable make distclean
    run master nuvolasdk check-project
    run master sh -c "./configure --genuine"
    run master make all
'
