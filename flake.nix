{
  inputs = {
    nixpkgs.url = "https://channels.nixos.org/nixos-26.05/nixexprs.tar.zst";

    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ nixpkgs, ... }:
    let
      forAll =
        f:
        nixpkgs.lib.genAttrs [ "aarch64-darwin" "x86_64-linux" ] (
          system: f nixpkgs.legacyPackages.${system}
        );
    in
    {
      formatter = forAll (pkgs: pkgs.nixfmt);

      packages = forAll (pkgs: {
        # nix run .#deploy
        deploy = pkgs.writeShellApplication {
          name = "deploy";
          runtimeInputs = [
            pkgs.rsync
            pkgs.nixos-rebuild
          ];
          text = ''
            host=web # ssh alias, see ~/.ssh/config
            root="$(git rev-parse --show-toplevel)"

            echo "==> lint + check + build (on this machine)"
            npm --prefix "$root/front" run lint
            npm --prefix "$root/front" run check
            npm --prefix "$root/front" run build

            echo "==> site -> $host:/var/www/s-miras/site"
            rsync -rlp --checksum --delete --info=stats1 \
              "$root/front/build/" "$host:/var/www/s-miras/site/"

            echo "==> system"
            nixos-rebuild switch \
              --flake "$root#web" \
              --target-host "$host" \
              --build-host "$host" \
              --sudo
          '';
        };
      });

      nixosConfigurations.web = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          inputs.disko.nixosModules.disko
          ./infra/configuration.nix
        ];
      };
    };
}
