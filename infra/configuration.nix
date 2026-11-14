{ lib, pkgs, ... }:

let
  user = "web";
  sshKeys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMqsNb2pPg1yKwbIjMmfLZkiu1UlIQtoSM0WzDmq3Mth"
  ];
in
{
  imports = [
    ./hardware-configuration.nix
    ./disko-config.nix
  ];

  boot.loader.grub = {
    enable = true;
    efiSupport = true;
    efiInstallAsRemovable = true;
  };

  zramSwap.enable = true;
  swapDevices = [
    {
      device = "/var/lib/swapfile";
      size = 2048; # MiB
    }
  ];

  networking.hostName = "web";
  networking.firewall.allowedTCPPorts = [
    22
    80
    443
  ];

  time.timeZone = "UTC";

  # --- access ---
  users.users.${user} = {
    isNormalUser = true;
    extraGroups = [ "wheel" ];
    openssh.authorizedKeys.keys = sshKeys;
  };
  security.sudo.wheelNeedsPassword = false;

  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
      PermitRootLogin = "no";
    };
  };

  services.fail2ban.enable = true;

  # --- web ---
  services.caddy = {
    enable = true;
    virtualHosts."s-miras.com".extraConfig = ''
      encode zstd gzip

      handle /api/* {
        reverse_proxy 127.0.0.1:8000
      }

      handle {
        root * /var/www/s-miras/site
        try_files {path} {path}.html /index.html
        file_server
      }
    '';
  };

  systemd.services.back =
    let
      python = pkgs.python3.withPackages (ps: [
        ps.fastapi
        ps.uvicorn
      ]);
      src = lib.fileset.toSource {
        root = ../back;
        fileset = ../back/main.py;
      };
    in
    {
      description = "FastAPI backend";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];
      serviceConfig = {
        ExecStart = "${python}/bin/uvicorn main:app --app-dir ${src} --host 127.0.0.1 --port 8000";
        Restart = "on-failure";
        DynamicUser = true;
        NoNewPrivileges = true;
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectControlGroups = true;
        RestrictAddressFamilies = [
          "AF_INET"
          "AF_INET6"
          "AF_UNIX"
        ];
        MemoryMax = "200M";
      };
    };

  systemd.tmpfiles.rules = [
    "d /var/www/s-miras       0755 ${user} users -"
    "d /var/www/s-miras/site  0755 ${user} users -"
  ];

  # --- nix / maintenance ---
  nix.settings = {
    experimental-features = [
      "nix-command"
      "flakes"
    ];
    trusted-users = [
      "root"
      user
    ];
  };
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 14d";
  };

  environment.systemPackages = with pkgs; [
    rsync
    neovim
  ];

  system.stateVersion = "26.05";
}
