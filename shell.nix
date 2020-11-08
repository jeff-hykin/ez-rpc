# Lets setup some definitions
let

    # pick the exact commit on the nixpkg repository we want to use
    # that way theres no ambiguity about the versions of tools we're using
    commitHash = "c83e13315caadef275a5d074243c67503c558b3b";
    # download that verion of the repo, and save the filepath to it
    nixpkgsSource = builtins.fetchTarball {
        url = "https://github.com/NixOS/nixpkgs/archive/${commitHash}.tar.gz";
    };
    # use the filepath to import all the packages, and send a config
    normalPackages = builtins.import nixpkgsSource {
        config = {
            allowUnfree = true;
        };
    };
    
    # the version of node we wanted wasn't inside of the normalPackages
    # so, we go find a differen version (different commit) of nix packages
    # that version of nix packages has the node package we want, so we pull
    # the node package out of that
    node = (builtins.import (builtins.fetchGit {
        # Descriptive name to make the store path easier to identify                
        name = "a-commit-with-node";                                                 
        url = "https://github.com/nixos/nixpkgs-channels/";                       
        ref = "refs/heads/nixpkgs-unstable";                     
        rev = "fa54dd346fe5e73d877f2068addf6372608c820b";                                           
    }) {}).nodejs-14_x;                                                                           

# using those definitions
in
    # create a shell
    normalPackages.mkShell {
        
        # inside that shell, use these packages
        buildInputs = [
            # main packages
            node
            # basic commandline tools
            normalPackages.bash_5
            normalPackages.which
            normalPackages.git
            normalPackages.colorls
            normalPackages.tree
            normalPackages.less
            normalPackages.niv
            normalPackages.cacert # needed for niv
            normalPackages.nix    # needed for niv
            normalPackages.nixops
            # 
            # how to add packages?
            # 
            # to find package verisons use:
            #     nix-env -qP --available PACKAGE_NAME_HERE | cat
            # ex:
            #     nix-env -qP --available opencv
            # to add those specific versions find the nixpkgs.STUFF 
            # and add it here^ as normalPackages.STUFF
            # ex find:
            #     nixpkgs.python38Packages.opencv3  opencv-3.4.8
            # ex add:
            #     normalPackages.python38Packages.opencv3
            # 
            # NOTE: some things (like setuptools) just don't show up in the 
            # search results for some reason, and you just have to guess and check 🙃 
        ];
        
        shellHook = ''
        # we don't want to give nix or other apps our home folder
        if [[ "$HOME" != "$(pwd)" ]] 
        then
            # so make the home folder the same as the project folder
            export HOME="$(pwd)"
            export NIX_PATH="nixpkgs=${nixpkgsSource}:."
            echo "This might take a few minutes..."
            nix-shell --pure
            exit
        fi
        #
        # find and run all the startup scripts in alphabetical order
        # 
        for file in ./settings/shell_startup/*
        do
            # make sure its a file
            if [[ -f $file ]]; then
                source $file
            fi
        done
        '';
    }

