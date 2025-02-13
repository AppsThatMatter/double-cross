{
  description =
    "Development environment for Tauri + GTK/WebKit with optional PostgreSQL via env var";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs";

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };

      mkScript = name: text:
        let script = pkgs.writeShellScriptBin name text;
        in script;

      scripts = [
        (mkScript "pg_start" "pg_ctl -D $PGDATA -l $PG/postgres.log start")
        (mkScript "pg_stop" "pg_ctl -D $PGDATA stop")
      ];
      baseNativeBuildInputs = with pkgs; [
        pkg-config
        gobject-introspection
        cargo
        cargo-tauri
        rustc
        nodejs
        bun
      ];

      baseBuildInputs = with pkgs; [
        at-spi2-atk
        atkmm
        cairo
        gdk-pixbuf
        glib
        gtk3
        harfbuzz
        librsvg
        libsoup_3
        pango
        webkitgtk_4_1
        openssl
      ];

      # --- Dev Shell Definition ---
    in {
      devShells = {
        "${system}" = {
          default = pkgs.mkShell {
            nativeBuildInputs = baseNativeBuildInputs;
            buildInputs = baseBuildInputs;
          };

          withPostgres = pkgs.mkShell {
            nativeBuildInputs = baseNativeBuildInputs;
            buildInputs = baseBuildInputs ++ [ pkgs.postgresql ] ++ scripts;
            shellHook = ''
              export PG=$PWD/.dev_postgres/
              export PGDATA=$PG/data
              export PGPORT=5432
              export PGHOST=localhost
              export PGUSER=$USER
              export PGPASSWORD=postgres
              export PGDATABASE=example
              export DB_URL=postgres://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE
              pg_startup() {
                # Stop the server if it's running
                pg_ctl -D "$PGDATA" stop

                # Initialize the database only if it hasn’t been set up already.
                if [ ! -f "$PGDATA/PG_VERSION" ]; then
                  initdb -D "$PGDATA" && \
                  echo "unix_socket_directories = '$PGDATA'" >> "$PGDATA/postgresql.conf"
                fi

                # Start the server and create the default database
                pg_ctl -D "$PGDATA" -l "$PG/postgres.log" start && \
                createdb
              }
            '';
          };
        };
      };
    };
}
