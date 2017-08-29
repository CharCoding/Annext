  //split from client.html to keep file size reasonable.
  //this file is for game classes (and some large variables):
  //selected, gameState, Hex class, Player class and Unit class

  var selected = {
    units : [],
    tile : {units : [], hexesWithinDist : function() {return [];}}, //avoid errors
    canMoveTo : [],
    moveTo : function(hex) {
      var unselected = [];
      for (let i = 0; i < selected.tile.units.length; i++) {
        if (!selected.tile.units[i].selected) unselected.push(selected.tile.units[i]);
      }
      selected.tile.units = unselected;
      hex.units = hex.units.concat(selected.units);
      for (let i = 0; i < selected.units.length; i++) {
        selected.units[i].movesLeft -= selected.tile.distanceTo(hex.x, hex.y);
      }
      for (let i = selected.units.length - 1; i >= 0; i--) {
        if (selected.units[i].typeName == "MRBMlaunched") {
          hex.nuke();
          selected.units.splice(i, 1);
          hex.units.splice(hex.units.indexOf(selected.units[i]), 1);
        }
      }
      selected.clear();
      if (selected.tile.owner) selected.tile.owner.updateOwnedTiles();
    },
    embarkTo : function(hex, unit) {
      let disembarked = [], embarkingTo = hex.getAllUnitsOfType(unit.typeName);
      if (unit.typeName == "AircraftCarrier") {
        for (let i = this.units.length - 1; i >= 0; i--) {
          if (this.units[i].isPlane) {
            var hasEmbarked = false;
            for (let j = 0; j < embarkingTo.length; j++) {
              if (embarkingTo[j].carriedPlanes() + 1 <= embarkingTo[j].carryPlanes) {
                this.tile.killUnit(this.units[i].typeName);
                embarkingTo[j].passengers = embarkingTo[j].passengers.concat(this.units.splice(i, 1));
                hasEmbarked = true;
                break;
              }
            }
            if (!hasEmbarked) disembarked.push(this.units[i].typeName);
          }
        }
      } else {
        for (let i = this.units.length - 1; i >= 0; i--) {
          if (!this.units[i].isPlane) {
            var hasEmbarked = false;
            for (let j = 0; j < embarkingTo.length; j++) {
              if (embarkingTo[j].carriedWeight() + this.units[i].weight <= embarkingTo[j].carryWeight) {
                this.tile.killUnit(this.units[i].typeName);
                embarkingTo[j].passengers = embarkingTo[j].passengers.concat(this.units.splice(i, 1));
                hasEmbarked = true;
                break;
              }
            }
            if (!hasEmbarked) disembarked.push(this.units[i].typeName);
          }
        }
      }
      for (let i = 0; i < this.tile.units.length; i++) { //IDK why but this prevents a bug
        this.tile.units[i].selected = false;
      }
      if (disembarked.length > 0) {
        alert("The following units could not be embarked because the transport unit's carrying capacity is not high enough: " + disembarked.join(", "))
      }
      this.clear();
    },
    disembarkTo : function(hex) {
      for (let i = 0; i < selected.units.length; i++) {
        for (let j = 0; j < selected.units[i].passengers.length; j++) {
          if (!selected.units[i].passengers[j].isPlane) selected.units[i].passengers[j].movesLeft = 0;
          selected.units[i].passengers[j].selected = false;
        }
        hex.units = hex.units.concat(selected.units[i].passengers);
        selected.units[i].passengers = [];
      }
      this.clear();
    },
    countPassengers : function() {
      let nums = [], passengerTypeNames = landUnitTypeNames.concat(airUnitTypeNames), draw = false;
      for (let i = 0; i < passengerTypeNames.length; i++) {
        nums.push(this.passengersOfType(passengerTypeNames[i]));
        if (nums[nums.length - 1] > 0) draw = true;
      }
      if (draw) passengerListDiv.style.display = "inline";
      if(!draw) passengerListDiv.style.display = "none";
      passengerList.innerHTML = "";
      for (let i = 0; i < passengerTypeNames.length; i++) {
        if (nums[i] != 0) {
          passengerList.innerHTML += passengerTypeNames[i] + ":" + nums[i] + "<br>";
        }
      }
    },
    passengersOfType : function(typeName) {
      let sum = 0;
      for (let i = 0; i < this.units.length; i++) {
        for (let j = 0; j < this.units[i].passengers.length; j++) {
          if (this.units[i].passengers[j].typeName == typeName) ++sum;
        }
      }
      return sum;
    },
    clear : function() {
      this.hideLaunchOption();
      this.hideBombOption();
      for (let i = 0; i < this.units.length; i++) this.units[i].selected = false;
      this.units = [];
      this.refreshMoves();
      this.countPassengers();
    },
    selectAllFromTile : function(hex) {
      this.clear();
      this.tile = hex;
      for (let i = 0; i < this.tile.units.length; i++) {
        this.tile.units[i].selected = true;
        this.units.push(this.tile.units[i]);
      }
      this.refreshMoves();
    },
    refreshMoves : function() {
      if (this.units.length === 0) {
        this.canMoveTo = [];
        return;
      }
      this.canMoveTo = this.tile.hexesWithinDist(this.moveRange(), this.moveBiomes());
    },
    moveRange : function() {
      var min = 999;
      for (let i = 0; i < this.units.length; i++) {
        min = Math.min(min, this.units[i].movesLeft);
      }
      return min;
    },
    moveBiomes : function() {
      var biomes = new Array(colors.length);
      biomes.fill(true);
      for (let i = 0; i < this.units.length; i++) {
        for (let j = 0; j < colors.length; j++) {
          if (!this.units[i].canMove[j]) biomes[j] = false;
        }
      }
      return biomes;
    },
    unitsOfType : function(typeName, returnArr) {
      let sum = 0, r = [];
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == typeName) ++sum;
        if (returnArr) r.push(this.units[i]);
      }
      if (returnArr) return r;
      return sum;
    },
    selectUnit : function(unit, hexx, hexy, selectAll) {
      if (selected.tile.x == hexx && selected.tile.y == hexy) {
        for (let i = 0; i < this.tile.units.length; i++) {
          if (this.tile.units[i].typeName == unit.typeName && this.tile.units[i].selected == false) {
            this.tile.units[i].selected = true;
            this.units.push(this.tile.units[i]);
            if (unit.category == 3) selected.showLaunchOption();
            if (unit.typeName == "Bomber" && unit.movesLeft > 1 && selected.tile.type != 0) this.showBombOption();
            this.countPassengers();
            if (!selectAll) return;
          }
        }
      } else { //if unit is on different tile
        this.clear();
        this.tile = map[hexx][hexy];
        unit.selected = true;
        this.units.push(unit);
      }
      if (selectAll) { //shift-click adds all of a type
        for (let i = 0; i < this.tile.units.length; i++) {
          if (this.tile.units[i].typeName == unit.typeName && this.tile.units[i].selected == false) {
            this.tile.units[i].selected = true;
            this.units.push(this.tile.units[i]);
          }
        }
      }
      this.countPassengers();
      if (unit.category == 3) selected.showLaunchOption();
      if (unit.typeName == "Bomber" && unit.movesLeft > 2 && selected.tile.type != 0) selected.showBombOption();
      this.refreshMoves();
    },
    hideLaunchOption : function() {missileLaunchButton.style.display = "none";},
    showLaunchOption : function() {missileLaunchButton.style.display = "inline";},
    hideBombOption : function() {bombButton.style.display = "none";},
    showBombOption : function() {
      bombButton.innerHTML = "CONDUCT BOMBING RAID (" + this.unitsOfType("Bomber") + " bombers)";
      bombButton.style.display = "inline";
    },
    confirmLaunch : function() {
      if (confirm("You are about to launch " + this.unitsOfType("ICBM") + " ICBMs and " + selected.unitsOfType("MRBM") + " MRBMs. Are you sure you wish to proceed?")) {
        selected.launch();
      } else alert("Nuclear war averted. For now.");
    },
    launch : function() {
      let missileArray = [], launched = [];
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].category == 3 && this.units[i].movesLeft > 0) missileArray.push(this.units[i]);
      }
      let owner = missileArray[0].owner;
      removeMultipleFromArrayByProp(this.tile.units, "category", 3, "selected", true);
      this.clear();
      for (let i = 0; i < missileArray.length; i++) {
        launched.push(new Unit(missileArray[i].typeName + "launched", owner));
      }
      selected.tile.units = selected.tile.units.concat(launched);
    },
    bomb : function() {
      let num = 0;
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == "Bomber" && this.units[i].movesLeft > 2) {
          ++num;
          this.units[i].movesLeft -= 1;
          moved = true;
        }
      }
      this.refreshMoves();
      this.tile.bomb(num);
    }
  },
  gameState = {
    turn : 0,
    nextRound : function() {
      for (let i = 0; i < players.length; i++) {
        players[i].nextTurn();
        if (players[i].uranium > 0) {
          players[i].development += Math.round(Math.log(players[i].uranium) * 4);
        }
      }
      players[0].updateInfoBar();
      ++gameState.turn;
      infoCurrentTurn.innerHTML = "Turn " + gameState.turn;
      let nukeList = [];
      for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map.length; y++) {
          for (let i = map[x][y].units.length - 1; i >= 0; i--) {
            map[x][y].units[i].movesLeft = map[x][y].units[i].move;
            if (launchedMissileTypeNames.indexOf(map[x][y].units[i].typeName) != -1) {
              --map[x][y].units[i].timeUntilDetonation;
              if (map[x][y].units[i].timeUntilDetonation < 0) {
                nukeList.push(map[x][y]);
                map[x][y].units.splice(i, 1);
              }
            }
          }
          if (map[x][y].type == 4 && Math.random() > 0.7) { //nuclear wasteland decay & damage
            map[x][y].type = 2;
            map[x][y].color = colors[2];
          } else if (map[x][y].type == 4) {
            map[x][y].mines = 0;
            map[x][y].uraniumMines = 0;
            map[x][y].uraniumRefineries = 0;
            map[x][y].oilRigs = 0;
            map[x][y].cities = Math.max(map[x][y].cities - 1, 0);
          }
          if(map[x][y].type==0) map[x][y].maxUnitsPerTurn=map[x][y].getMaxUnitsPerTurn();//assign max unit build number to sea tiles
          map[x][y].killUnbasedUnits();
          if (map[x][y].damage >= 3) {
            while (map[x][y].damage >= 3) {
              map[x][y].damage -= 2;
              let building = map[x][y].getRandomBuilding();
              if (building != undefined) {
                --map[x][y][building];
              } else if(map[x][y].cities > 0) {
                --map[x][y].cities;
              } else {
                map[x][y].damage = 0;
              }
            }
          } else if (map[x][y].damage > 0) {
            ++map[x][y].damage;
          }
        }
      }
      for (let i = 0; i < nukeList.length; i++) nukeList[i].nuke();
      moved = true;
    }
  }
  class Hex {
    constructor(x, y, type){
      this.type = type;
      this.x = x;
      this.y = y;
      this.ownedBy = "";
      this.ownerColor = "#0000ff";
      this.unitsBuiltThisTurn = 0;
      this.maxUnitsPerTurn = 0;
      this.cities = 0;
      this.mines = 0;
      this.oilRigs = 0;
      this.uraniumMines = 0;
      this.uraniumRefineries = 0;
      this.units = [];
      this.isCapital = false;
      this.development = Infinity; //reserves of each resource
      this.iron = 0; //resource amounts set during map gen
      this.oil = 0;
      this.uranium = 0;
      this.ironSources = 0; //number of sources of each resource - determines how fast resource is extracted
      this.oilSources = 0;
      this.uraniumSources = 0;
      this.damage = 0;
      this.hexDisp = { //unit display locations specified in unit objects
        mines : [-1, 1],
        oilRigs : [0, 1],
        uraniumMines : [-1, 0],
        uraniumRefineries : [1, 0],
        iron : [-2, 2],
        uranium : [-1, 2],
        oil : [0, 2]
      }
      return map[x][y] = this;
    }
    get color() {
      return colors[this.type];
    }
    get neighbors(){
      return [ // does this really work?
        map[mod(this.x + 1, mapSize)][this.y],
        map[mod(this.x + 1, mapSize)][mod(this.y - 1, mapSize)],
        map[this.x][mod(this.y - 1, mapSize)],
        map[mod(this.x - 1, mapSize)][this.y],
        map[mod(this.x - 1, mapSize)][mod(this.y + 1, mapSize)],
        map[this.x][mod(this.y + 1, mapSize)],
      ];
    }
    get owner() {
      for (let i = 0; i < players.length; i++) {
        if (players[i].name == this.ownedBy) return players[i];
      }
    }
    adjacentToLand(requirePlayerTile) {
      for (let i = 0; i < this.neighbors.length; i++) {
        if (this.neighbors[i].type != 0) {
          if (requirePlayerTile && this.neighbors[i].owner == players[0]) {
            return true;
          } else if (!requirePlayerTile) {
            return true;
          }
        }
      }
    }
    adjacentPlayerNumber() {
      let arr = [];
      for (let i = 0; i < this.neighbors.length; i++) {
        if (this.neighbors[i].owner != null) arr.push(this.neighbors[i].owner.name);
      }
      return [...new Set(arr)].length;
    }
    hexesWithinDist(n, moveBiomes) {
      if (moveBiomes == undefined) moveBiomes = [1, 1, 1, 1];
      var canGo = [this],
      fringes = [[this]];
      for (let i = 1; i <= n; i++) {
        fringes.push([]);
        for (let j = 0; j < fringes[i-1].length; j++) {
          for (let k = 0; k < fringes[i-1][j].neighbors.length; k++) {
            let neighbor = fringes[i-1][j].neighbors[k];
            if (canGo.indexOf(neighbor) == -1 && moveBiomes[neighbor.type]) {
              canGo.push(neighbor);
              fringes[i].push(neighbor);
            }
          }
        }
      }
      return canGo;
    }
    interiorPoint(x, y, n) {
      let dx = Math.sqrt(3) * (x + y / 2) * r / n / 1.5, //no idea where the 1.5 comes from, but it works
      dy = 3/2 * y * r / n / 1.5;
      return [dx + (this.x + this.y) * r * 1.5, dy + (this.y - this.x) * r * .866];
    }
    draw(color, r){
      r = r || 16;
      let x = (this.x + this.y) * r * 1.5, y = (this.y - this.x) * r * .866,
      Hshift = mapSize * r * 1.5, Vshift = mapSize * r * .866, borders = [];
      if(this.owner) {
        for(let i = 0, n = this.neighbors; i < 6; i++){
          if(n[i].owner != this.owner) {
            borders.push(i);
          }
        }
      }
      if (politicalMapMode) {
        if (this.owner != null) {
          borders.push(getColorFromScale(this.owner.hexColor, "#000000", 0.25));
        } else if (this.type == 0) {
          borders.push("#00018b")
        } else borders.push("#d7d7d7");
      } else if (this.owner) {
        borders.push(this.owner.hexColor);
      }
      if (selected.canMoveTo.indexOf(this) != -1 && color != "outline") {
        color = getColorFromScale(colors[this.type], "#000000", 0.25);
      }
      if (selected.canMoveTo.indexOf(this) != -1 && politicalMapMode) {
        borders[borders.length - 1] = getColorFromScale(borders[borders.length - 1], "#ffffff", 0.4)
      }
      color = color || this.color;
      /*if (useInfiniteScroll) {
        this.renderWhere = [[0, 0], [-Hshift * 2, 0], [-Hshift, -Vshift], [-Hshift, Vshift],
          [Hshift, -Vshift], [Hshift, Vshift], [Hshift * 2, 0]];
      } else {
        this.renderWhere = [[0,0]];
      }*/
      for (let i = 0; i < this.renderWhere.length; i++) {
        Hex.render(x + this.renderWhere[i][0], y + this.renderWhere[i][1], color, borders)
      }
    }
    getMaxUnitsPerTurn() {
      let sum = this.cities;
      for (let i = 0; i < this.neighbors.length; i++) {
        if (this.neighbors[i].owner == this.owner && this.type != 0) {
          sum += this.neighbors[i].cities;
        } else if (this.type == 0) sum += this.neighbors[i].cities;
      }
      if (this.type == 0) {
        if (this.adjacentPlayerNumber() != 1) return 0;
        return sum;
      } else {
        return sum;
      }
    }
    drawUnits() {
      for (let i = 0; i < unitTypeNames.length; i++) {
        let num = this.unitsOfType(unitTypeNames[i]),
        isMissile = false;
        if (unitTypeNames[i] == "MRBM" || unitTypeNames[i] == "ICBM") isMissile = true;
        if (num !== 0) {
          let unitObject;
          for (let j = 0; j < this.units.length; j++) {
            if (this.units[j].typeName == unitTypeNames[i]) unitObject = this.units[j];
          }
          var coords = this.interiorPoint(unitObject.hexDisp[0], unitObject.hexDisp[1], 3), numSelected = 0;
          if (selected.tile.x == this.x && selected.tile.y == this.y) {
            numSelected = selected.unitsOfType(unitTypeNames[i]);
          }
          for (let j = 0; j < this.renderWhere.length; j++) {
            unitObject.render(coords[0] + this.renderWhere[j][0], coords[1] + this.renderWhere[j][1], num, numSelected, this.x, this.y, isMissile);
          }
        }
      }
    }
    drawBuildings() {
      var [x, y] = hexCoordToPoint(this.x, this.y),
      buildings = ["mines", "oilRigs", "uraniumMines", "uraniumRefineries"],
      bIcons = ["Mine", "OilRig", "UraniumMine", "UraniumRefinery"];
      if (this.cities > 0) {
        for (let i = 0; i < this.renderWhere.length; i++) {
          t.fillStyle = this.owner.hexColor;
          t.strokeStyle = "black";
          t.lineWidth = 1;
          t.beginPath();
          t.arc(x + this.renderWhere[i][0], y + this.renderWhere[i][1], r / 4.5, 0, Math.PI * 2);
          t.stroke();
          t.fill();
          t.fillStyle = "white";
          t.font = "6px sans-serif";
          t.textAlign = "center";
          t.fillText(this.cities, x + this.renderWhere[i][0], y + this.renderWhere[i][1] + 2);
        }
      }
      if (this.damage > 0) {
        var dp = this.interiorPoint(1, -2, 3);
        for (let j = 0; j < this.renderWhere.length; j++) {
          t.drawImage(spritesheet, 350, 0, 50, 50, dp[0] + this.renderWhere[j][0] - iconSize / 2,
            dp[1] + this.renderWhere[j][1] - iconSize / 2, iconSize, iconSize);
          this.addText(1, -2, this.damage);
        }
      }
      for (let i = 0; i < buildings.length; i++) {
        if (this[buildings[i]] > 0) {
          var dp = this.interiorPoint(this.hexDisp[buildings[i]][0], this.hexDisp[buildings[i]][1], 3);
          for (let j = 0; j < this.renderWhere.length; j++) {
            t.drawImage(spritesheet, 250, buildingTypeNames.indexOf(bIcons[i]) * 50,
              50, 50, dp[0] + this.renderWhere[j][0] - iconSize / 2,
              dp[1] + this.renderWhere[j][1] - iconSize / 2, iconSize, iconSize);
          }
          if (this[buildings[i]] > 1) {
            this.addText(this.hexDisp[buildings[i]][0], this.hexDisp[buildings[i]][1], this[buildings[i]]);
          }
        }
      }
    }
    drawResources() {
      var [x, y] = hexCoordToPoint(this.x, this.y),
      resources = ["iron", "oil", "uranium"];
      for (let i = 0; i < resources.length; i++) {
        if (this[resources[i]] > 0) {
          var dp = this.interiorPoint(this.hexDisp[resources[i]][0], this.hexDisp[resources[i]][1], 3);
          for (let j = 0; j < this.renderWhere.length; j++) {
            t.drawImage(spritesheet, 300, resourceTypeNames.indexOf(resources[i]) * 50,
            50, 50, dp[0] + this.renderWhere[j][0] - iconSize / 2,
            dp[1] + this.renderWhere[j][1] - iconSize / 2, iconSize, iconSize);
          }
          if (this[resources[i] + "Sources"] > 1) {
            this.addText(this.hexDisp[resources[i]][0], this.hexDisp[resources[i]][1], this[resources[i] + "Sources"]);
          }
        }
      }
    }
    addText(ix, iy, txt) {
      var point = this.interiorPoint(ix, iy, 3);
      t.fillStyle = "#fff";
      t.font = "2px sans-serif";
      t.textAlign = "center";
      for (let j = 0; j < this.renderWhere.length; j++) {
        t.fillText(txt, point[0] + this.renderWhere[j][0] + 2, point[1] + this.renderWhere[j][1]);
      }
    }
    static render(x, y, color, borders) {
      let pt = t.originalPoint(x, y), HP = r * t.getTransform().a, VP = HP * .866;
      if(pt.x + HP < 0 || pt.x - HP > width || pt.y + VP < 0 || pt.y - VP > height) return;
      t.beginPath();
      t.moveTo(x + r, y);
      t.lineTo(x + r / 2, y + r * .866);
      t.lineTo(x - r / 2, y + r * .866);
      t.lineTo(x - r, y);
      t.lineTo(x - r / 2, y - r * .866);
      t.lineTo(x + r / 2, y - r * .866);
      t.closePath();
      if (politicalMapMode && color != "outline") {
        t.fillStyle = borders[borders.length - 1];
        t.fill();
      } else if(color == "outline") {
        t.lineWidth = 1;
        t.strokeStyle = "#ffffff";
        t.stroke();
        t.lineWidth = 1;
      } else {
        t.lineWidth = 1;
        t.fillStyle = color;
        t.fill();
      }
      let borderColor = borders.pop();
      if(!borderColor) return;
      for(let i = 0; i < borders.length; i++){
        let ang = borders[i];
        t.beginPath();
        t.moveTo(x + Math.cos(Math.PI / 3 * ang) * r * 0.95, y - Math.sin(Math.PI / 3 * ang) * r * 0.95);
        t.lineTo(x + Math.cos(Math.PI / 3 * (ang + 1)) * r * 0.95, y - Math.sin(Math.PI / 3 * (ang + 1)) * r * 0.95);
        t.strokeStyle = borderColor;
        t.stroke();
      }
    }
    static round(x, y){
      [x, y] = [(x - 1.732 * y) / r / 3, (x + 1.732 * y) / r / 3];
      let z = -x - y, _x = Math.round(x), _y = Math.round(y), _z = Math.round(z),
        dx = Math.abs(x - _x), dy = Math.abs(y - _y), dz = Math.abs(z - _z),
        dm = Math.max(dx, dy, dz);
      if (dm == dx) {
        return map[mod(-_y - _z, mapSize)][mod(_y, mapSize)];
      } else if (dm == dy) {
        return map[mod(_x, mapSize)][mod(-_x - _z, mapSize)];
      } else if (dm == dz) {
        return map[mod(_x, mapSize)][mod(_y, mapSize)];
      } else return {draw:function(){}}; // avoid errors lol
    }
    static round2(x, y) { //same as round but returns coordinates instead of returning map hex
      var rx = Math.round(x),
      ry = Math.round(-x-y),
      rz = Math.round(y),
      x_diff = Math.abs(rx - x),
      y_diff = Math.abs(ry + x + y),
      z_diff = Math.abs(rz - y);
      if (x_diff > y_diff && x_diff > z_diff) {
        rx = -ry-rz
      } else if (y_diff > z_diff) {
          ry = -rx-rz
      } else {
        rz = -rx-ry
      }
      return [rx, rz];
    }
    distanceTo(hx, hy) {
      let x1 = this.x, x2 = hx, y1 = this.y, y2 = hy, z1 = -this.y-this.x, z2 = -hx-hy;
      if (x2 > y2) {
        var vx = x2 - mapSize;
        var vy = y2;
      } else {
        var vx = x2;
        var vy = y2 - mapSize;
      }
      return Math.min(Math.max(Math.abs(x1-x2), Math.abs(y1-y2), Math.abs(z1-z2)),
        Math.max(Math.abs(x1-vx), Math.abs(y1-vy), Math.abs(-vx-vy)));
    }
    killUnbasedUnits() {
      for (let i = this.units.length - 1; i >= 0; i--) {
        if (!this.units[i].isBase[this.type]) this.units.splice(i, 1);
      }
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == "AircraftCarrier") {
          let excessPlanes = this.units[i].carriedPlanes() - this.units[i].carryPlanes;
          while (excessPlanes > 0) {
            this.units[i].passengers.pop();
            --excessPlanes;
          }
        } else {
          let excessWeight = this.units[i].carriedWeight() - this.units[i].carryWeight;
          while (excessWeight > 0) {
            let killed = this.units[i].passengers.pop();
            excessWeight -= killed.weight;
          }
        }
      }
    }
    unitsOfType(typeName) {
      let sum = 0;
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == typeName) ++sum;
      }
      return sum;
    }
    passengersOn(typeName) {
      let sum = 0;
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == typeName) sum += this.units[i].passengers.length;
      }
      return sum;
    }
    getAllUnitsOfType(typeName) {
      let r = [];
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].typeName == typeName) r.push(this.units[i]);
      }
      return r;
    }
    extractResources() {
      var production = {
        development : this.cities,
        oil : this.oilRigs,
        iron : this.mines,
        uranium : this.uraniumMines
      }
      this.developmentSources = this.cities; //to avoid having to program exception for cities below
      for (let i in production) {
        let increment = Math.min(this[i + "Sources"], production[i])
        this[i] -= increment;
        production[i] = increment;
        if (this[i] < 0) {
          production[i] += this[i];
          this[i] = 0;
        }
      }
      return production;
    }
    addResource(type, quantity) {
      if (quantity == undefined) quantity = defaultResourceQuantity;
      this[type] += quantity;
      ++this[type + "Sources"];
    }
    isClickOnUnit(x, y) {
      var [tx, ty] = hexCoordToPoint(this.x, this.y),
      [x, y] = this.getDefaultLoc(x, y),
      n = 3;
      x -= tx;
      y -= ty;
      var hexCoords = Hex.round2((x * Math.sqrt(3)/3 - y/3) / (r/3/1.5), y * 2/3 / (r/3/1.5));
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].hexDisp[0] == hexCoords[0] && this.units[i].hexDisp[1] == hexCoords[1]) {
          return true;
        }
      }
      return false;
    }
    getDefaultLoc(x, y) {
      for (let i = 0; i < this.renderWhere.length; i++) {
        let vx = x - this.renderWhere[i][0], vy = y - this.renderWhere[i][1],
        coords = Hex.round2(pixelToHex(vx,vy)[0], pixelToHex(vx,vy)[1]);
        if (coords[0] >= 0 && coords[1] >= 0 && coords[0] < mapSize && coords[1] < mapSize) {
          return [vx, vy];
        }
      }
      return [];
    }
    click(x, y, selectAll, mode) {
      var [tx, ty] = hexCoordToPoint(this.x, this.y),
      [x, y] = this.getDefaultLoc(x, y),
      n = 3;
      x -= tx;
      y -= ty;
      var hexCoords = Hex.round2((x * Math.sqrt(3)/3 - y/3) / (r/n/1.5), y * 2/3 / (r/n/1.5));
      if (mode == "disembark" && (selected.tile.neighbors.indexOf(this) != -1 || selected.tile == this)){
        selected.disembarkTo(this);
        return;
      }
      for (let i = 0; i < this.units.length; i++) {
        if (this.units[i].hexDisp[0] == hexCoords[0] && this.units[i].hexDisp[1] == hexCoords[1]) {
          if (mode == "embark" && selected.tile.hexesWithinDist(selected.moveRange()).indexOf(this) != -1) {
            selected.embarkTo(this, this.units[i]);
            return;
          } else {
            this.units[i].click(this.x, this.y, selectAll);
            return;
          }
        }
      }
      selected.clear();
      if (selectAll) selected.selectAllFromTile(this);
      /*for (let i in this.hexDisp) {
        if (hexCoords[0] == this.hexDisp[i][0] && hexCoords[1] == this.hexDisp[i][1] && this[i] > 0) {
          //IN CASE BUILDINGS NEED TO DO SOMETHING ON CLICK, UNCOMMENT AND ADD SOMETHING HERE
        }
      }*/
    }
    killUnitsWithProbability(prob, exempted) {
      if (exempted == undefined) exempted = [];
      for (let i = 0; i < this.units.length; i++) {
        if (Math.random() > prob || exempted.indexOf(this.units[i].typeName) != -1) {
          this.units[i].markedForDestruction = false;
        } else this.units[i].markedForDestruction = true;
      }
      this.units = removeMultipleFromArrayByProp(this.units, "markedForDestruction", true);
    }
    killUnit(typeName) {
      for (let i = this.units.length - 1; i >= 0; i--) {
        if (this.units[i].typeName == typeName) {
          this.units.splice(i, 1);
          return;
        }
      }
    }
    getRandomBuilding() {
      //used for deciding which building to kill once a tile reaches a certain amount of damage
      let arr = [];
      arr = arr.concat(new Array(this.mines).fill("mines"));
      arr = arr.concat(new Array(this.uraniumMines).fill("uraniumMines"));
      arr = arr.concat(new Array(this.oilRigs).fill("oilRigs"));
      arr = arr.concat(new Array(this.uraniumRefineries).fill("uraniumRefineries"));
      return arr[Math.floor(Math.random() * arr.length)]; //^is there a better way to do this?
    }
    nuke() { //this function is totally MAD
      this.cities = Math.floor(this.cities / 3);
      this.oil = 0;
      this.oilSources = 0;
      this.iron = 0;
      this.ironSources = 0;
      this.uranium = 0;
      this.uraniumSources = 0;
      this.mines = 0;
      this.uraniumMines = 0;
      this.oilRigs = 0;
      this.uraniumRefineries = 0;
      this.killUnitsWithProbability(0.4, launchedMissileTypeNames);
      for (let i = 0; i < this.neighbors.length; i++) {
        this.neighbors[i].cities = Math.floor(this.neighbors[i].cities / 1.5);
        this.neighbors[i].killUnitsWithProbability(0.2);
      }
      moved = true;
      if (this.type != 0) {
        this.type = 4;
      }
    }
    bomb(bombers) {
      this.damage += bombers;
    }
  }
  class Player {
    constructor(country){
      this.name = country;
      this.abbr = getAbbr(country);
      this.capital = { x: -1, y: -1 };
      this.development = 0;
      this.canReconstituteCities = true;
      this.oil = 0;
      this.iron = 0;
      this.uranium = 0;
      this.enrichedUranium = 0;
      this.oilProduction = 0;
      this.ironProduction = 0;
      this.uraniumProduction = 0;
      this.tiles = 6;
      this.history = {
        development:[10], ironProduction:[0], oilProduction:[0], tiles:[6],
        airUnits:[0], landUnits:[6], seaUnits:[0],
        nuclearWeapons:[0]
      }
      this.buildings = 0;
      this.landUnits = 0;
      this.seaUnits = 0;
      this.airUnits = 0;
      this.nuclearWeapons = 0;
      this.tileList = [];
      this.color = 'indigo'; // TEMPORARY, players should get color code from server.
      this.hexColor = '#3f51b5'; // used by Hex.draw, (borders/units/buildings etc.)
      this.reconstitutedCities = 0;
    }
    updateInfoBar() {
      for (let i = 0; i < resourceNames.length - 1; i++) {
        if (resourceNames[i] != "uranium") {
          document.getElementById("info-" + resourceNames[i]).innerHTML = "<i class='material-icons'>" + materialResourceIcons[resourceNames[i]] + "</i>" + this[resourceNames[i]];
        }
        if (resourceNames[i] == "development") {
          document.getElementById("info-" + resourceNames[i]).innerHTML += "/" + this.totalCities();
        }
      }
      document.getElementById("info-uranium").innerHTML = '<img src="images/radioactive.png" width="24" height="24"></i>' + players[0].enrichedUranium + "/" + players[0].uranium;
      if (this.reconstitutedCities > 0) {
        document.getElementById("reconstituted-cities").innerHTML = "RCs: " + this.reconstitutedCities;
      } else {
        document.getElementById("reconstituted-cities").innerHTML = "";
      }
    }
    totalCities() {
      let sum = 0;
      for (let i = 0; i < this.tileList.length; i++) {
        sum += this.tileList[i].cities;
      }
      return sum;
    }
    get numberOfUnits() {
      return this.landUnits + this.seaUnits + this.airUnits;
    }
    chat(text) {
      msg.innerHTML += `<div class="row valign-wrapper"><div class="col right-align">${HTMLescape(text)}</div><div class="col icon"><div class="circle ${this.color} white-text right">${this.abbr}</div></div></div>`;
      msg.scrollTop = msg.scrollHeight;
      // webSocket majikz
    }
    reconstituteCity(x, y) {
      --map[x][y].cities;
      ++this.reconstitutedCities;
      this.updateInfoBar();
    }
    addUnit(x, y, unitType, build) {
      if (build == undefined) build = true; //build = build || true;
      let hex = map[x][y],
      unit = new Unit(unitType, this);
      if (!(hex.maxUnitsPerTurn > hex.unitsBuiltThisTurn)) return false;
      if (hex.type != 0 && hex.cities == 0) return false;
      for (let i = 0; i < unit.cost.length; i++) {
        if (this[resourceNames[i]] < unit.cost[i]) {
          return false;
        }
      }
      if (!build) return true;
      for (let i = 0; i < unit.cost.length; i++) this[resourceNames[i]] -= unit.cost[i];
      this.updateInfoBar();
      unit.movesLeft = 0;
      map[x][y].units.push(unit);
      ++hex.unitsBuiltThisTurn;
      // more webSocket majikz and map majikz
    }
    addBuilding(x, y, building, build) {
      if (build == undefined) build = true;//build = build || true;
      let hex = map[x][y], cost = [];
      switch (building) {
        case "Mine":
          cost = [4, 0, 4, 0];
          break;
        case "OilRig":
          cost = [4, 4, 0, 0];
          break;
        case "UraniumMine":
          cost = [8, 4, 4, 0];
          break;
        case "UraniumRefinery":
          cost = [20, 3, 10, 3];
          break;
        case "City":
          cost = [4 + hex.cities];
          break;
      }
      for (let i = 0; i < cost.length; i++) {
        if (this[resourceNames[i]] < cost[i]) return false;
      }
      if (!build) return true;
      for (let i = 0; i < cost.length; i++) this[resourceNames[i]] -= cost[i];
      switch (building) {
        case "Mine":
          ++map[x][y].mines;
          break;
        case "OilRig":
          ++map[x][y].oilRigs;
          break;
        case "UraniumMine":
          ++map[x][y].uraniumMines;
          break;
        case "UraniumRefinery":
          ++map[x][y].uraniumRefineries;
          break;
        case "City":
          ++map[x][y].cities;
          this.canReconstituteCities = false;
      }
      this.updateInfoBar();
      // even more webSocket majikz and map majikz
    }
    repairDamage(x, y, repair) {
      let cost = [1, 1, 1, 0];
      for (let i = 0; i < cost.length; i++) {
        if (this[resourceNames[i]] < cost[i]) return false;
      }
      if (!repair) return true;
      for (let i = 0; i < cost.length; i++) this[resourceNames[i]] -= cost[i];
      --map[x][y].damage;
      this.updateInfoBar();
    }
    addResource(x, y, resourceType, build) {
      if (build == undefined) build = true;
      if (this.reconstitutedCities < 2) return false;
      if (!build) return true;
      this.reconstitutedCities -= 2;
      map[x][y].addResource(resourceType);
      this.updateInfoBar();
    }
    getTileResources() {
      for (let i = 0; i < this.tileList.length; i++) {
        let tileResources = this.tileList[i].extractResources();
        for (let j in tileResources) {
          this[j] += tileResources[j];
          if (j != "development") this[j + "Production"] += tileResources[j];
        }
        if (this.tileList[i].uraniumRefineries > 0 && this.uranium > 0) {
          --this.uranium;
          ++this.enrichedUranium;
        }
      }
    }
    updateOwnedTiles() {
      for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[x].length; y++) {
          if (map[x][y].owner == null && map[x][y].unitsOfType("Infantry") > 0) {
            if (map[x][y].units[0].owner.name == this.name) {
              map[x][y].ownedBy = this.name;
              this.tileList.push(map[x][y]);
            }
          }
        }
      }
    }
    nextTurn() {
      this.oilProduction = 0;
      this.ironProduction = 0;
      this.uraniumProduction = 0;
      this.seaUnits = 0;
      this.landUnits = 0;
      this.airUnits = 0;
      this.development = 0;
      this.tiles = 0;
      this.reconstitutedCities = 0;
      this.canReconstituteCities = true;
      this.getTileResources();
      this.updateOwnedTiles();
      for (let i = 0; i < this.tileList.length; i++) {
        this.tileList[i].maxUnitsPerTurn = this.tileList[i].getMaxUnitsPerTurn();
      }
      for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map.length; y++) {
          if (map[x][y].owner == this) ++this.tiles;
          for (let z = 0; z < map[x][y].units.length; z++) {
            let oilRigFound = false;
            if (map[x][y].units[z].owner == this) {
              let u = map[x][y].units[z].typeName;
              if (seaUnitTypeNames.indexOf(u) != -1) ++this.seaUnits;
              if (landUnitTypeNames.indexOf(u) != -1) ++this.landUnits;
              if (airUnitTypeNames.indexOf(u) != -1) ++this.airUnits;
              if (u == "ICBM" || u == "MRBM") ++this.nuclearWeapons;
              if (u == "OffshoreRig" && !oilRigFound) {
                let incr = Math.min(map[x][y].oilSources, map[x][y].unitsOfType("OffshoreRig"))
                this.oil += incr;
                this.oilProduction += incr;
                map[x][y].oil -= incr;
                if (map[x][y].oil < 0) {
                  this.oil += map[x][y].oil;
                  this.oilProduction += map[x][y].oil;
                  map[x][y].oil = 0;
                }
              }
            }
          }
        }
      }
      this.updateInfoBar();
      this.history.development.push(this.totalCities());
      this.history.ironProduction.push(this.ironProduction);
      this.history.oilProduction.push(this.oilProduction);
      this.history.tiles.push(this.tiles);
      this.history.airUnits.push(this.airUnits);
      this.history.landUnits.push(this.landUnits);
      this.history.seaUnits.push(this.seaUnits);
      this.history.nuclearWeapons.push(this.nuclearWeapons);
    }
    canAfford(dev, oil, iron, uranium) {
      if (dev > this.development) return false;
      if (oil > this.oil) return false;
      if (iron > this.iron) return false;
      if (uranium > this.uranium) return false;
      return true;
    }
    unenrichUranium() {
      if (this.enrichedUranium > 0) {
        --this.enrichedUranium;
        ++this.uranium;
        this.updateInfoBar();
      } else {
        alert("You have no enriched uranium that can be converted back into regular uranium.");
      }
    }
  }
  class Unit {
    constructor(typeName, owner, color) {
      this.owner = owner;
      this.color = color || owner.hexColor;
      this.typeName = typeName;
      this.passengers = [];
      this.carryPlanes = 0; //defaults (most common)
      this.carryWeight = 0;
      this.isPlane = false;
      this.selected = false;
      switch (typeName) {
        case "Infantry":
          this.move = 2;
          this.cost = [1, 1, 0, 0, 0];
          this.weight = 1;
          this.canMove = [false, true, true, true, true]; //[0] -> sea, [1] -> land, [2] -> desert, etc.
          this.isBase = [false, true, true, true, false]; //can unit stop and stay there without dying
          this.hexDisp = [-1, -1]; //where in a tile the unit is displayed (see the intrahex position helper in the images folder)
          this.category = 1; //0->sea; 1->land; 2->air; 3->missile (used when drawing unit)
          break;
        case "MechanizedInfantry":
          this.move = 2;
          this.cost = [2, 1, 0, 0, 0];
          this.weight = 2;
          this.canMove = [false, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.hexDisp = [2, -1];
          this.category = 1;
          break;
        case "Artillery":
          this.move = 2;
          this.cost = [3, 1, 0, 0, 0];
          this.weight = 2;
          this.canMove = [false, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.hexDisp = [-2, 1]
          this.category = 1;
          break;
        case "Tank":
          this.move = 2;
          this.cost = [2, 1, 1, 0, 0];
          this.weight = 2;
          this.canMove = [false, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.hexDisp = [1, 1]
          this.category = 1;
          break;
        case "Destroyer":
          this.move = 3;
          this.cost = [2, 0, 2, 0, 0];
          this.weight = 40; //some number larger than what anything can carry
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [0, -1];
          this.category = 0;
          break;
        case "Cruiser":
          this.move = 3;
          this.cost = [2, 2, 0, 0, 0];
          this.weight = 40;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [1, 0];
          this.category = 0;
          break;
        case "Battleship":
          this.move = 3;
          this.cost = [2, 2, 2, 0, 0];
          this.weight = 40;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [-1, 0];
          this.category = 0;
          break;
        case "AircraftCarrier":
          this.move = 3;
          this.cost = [3, 1, 3, 0, 0];
          this.weight = 80;
          this.carryWeight = 0;
          this.carryPlanes = 4;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [0, 0];
          this.category = 0;
          break;
        case "Submarine":
          this.move = 3;
          this.cost = [2, 2, 0, 0, 0];
          this.weight = 40;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [-1, 2];
          this.category = 0;
          break;
        case "Transport":
          this.move = 3;
          this.cost = [1, 4, 0, 0, 0];
          this.weight = 40;
          this.carryWeight = 12;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [1, -1];
          this.category = 0;
          break;
        case "OffshoreRig":
          this.move = 1;
          this.cost = [4, 4, 1, 0, 0];
          this.weight = 999;
          this.carryWeight = 0;
          this.canMove = [true, false, false, false, false];
          this.isBase = [true, false, false, false, false];
          this.hexDisp = [2, -1];
          this.category = 0;
          break;
        case "Fighter":
          this.move = 8;
          this.cost = [8, 0, 3, 0, 0];
          this.weight = 999;
          this.carryWeight = 1;
          this.canMove = [true, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.isPlane = true;
          this.hexDisp = [0, -2];
          this.category = 2;
          break;
        case "Bomber":
          this.move = 8;
          this.cost = [12, 3, 3, 0, 0];
          this.weight = 999;
          this.carryWeight = 2;
          this.canMove = [true, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.isPlane = true;
          this.hexDisp = [2, -2];
          this.category = 2;
          break;
        case "Helicopter":
          this.move = 3;
          this.cost = [3, 1, 1, 0, 0];
          this.weight = 2;
          this.canMove = [true, true, true, true, true];
          this.isBase = [false, true, true, false, false];
          this.hexDisp = [1, -2];
          this.category = 2;
          break;
        case "MRBM":
          this.move = 1;
          this.cost = [8, 1, 1, 0, 2];
          this.weight = 12;
          this.canMove = [false, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.hexDisp = [-2, 0];
          this.category = 3;
          break;
        case "MRBMlaunched":
          this.timeUntilDetonation = 0;
          this.move = 6;
          this.cost = [0, 0, 0, 0, 0];
          this.weight = 999;
          this.canMove = [true, true, true, true, true];
          this.isBase = [false, false, false, false, false];
          this.hexDisp = [-2, 0];
          this.category = 4;
          break;
        case "ICBM":
          this.move = 1;
          this.cost = [12, 1, 2, 0, 2];
          this.weight = 12;
          this.canMove = [false, true, true, true, true];
          this.isBase = [false, true, true, true, false];
          this.hexDisp = [2, 0];
          this.category = 3;
          break;
        case "ICBMlaunched":
          this.timeUntilDetonation = 1;
          this.move = 6;
          this.cost = [0, 0, 0, 0, 0];
          this.weight = 999;
          this.canMove = [true, true, true, true, true];
          this.isBase = [true, true, true, true, true];
          this.hexDisp = [2, 0];
          this.category = 4;
          break;
      }
      this.movesLeft = this.move;
    }
    icon() {
      return document.getElementById(iconSet + this.typeName);
    }
    canCarry(unit) {
      if (unit.isPlane) {
        if (this.carriedPlanes() + 1 > this.carryPlanes) return false;
        return true;
      } else {
        if (this.carriedWeight() + unit.weight > this.carryWeight) return false;
        return true;
      }
    }
    carriedWeight() { //does not count airplanes
      let sum = 0;
      for (let i = 0; i < this.passengers.length; i++) {
        if (!this.passengers[i].isPlane) sum += this.passengers[i].weight;
      }
      return sum;
    }
    carriedPlanes() {
      let sum = 0;
      for (let i = 0; i < this.passengers.length; i++) {
        if (this.passengers[i].isPlane) ++sum;
      }
      return sum;
    }
    click(hexx, hexy, selectAll) {
      selected.selectUnit(this, hexx, hexy, selectAll);
    }
    render(x, y, number, numSelected, mx, my, isMissile) { //DRAW UNITS
      let size = iconSize;
      t.fillStyle = this.color;
      if (this.canMove[0] && iconSet == "icon" && !isMissile) {
        t.lineWidth = 0.5;
        t.strokeStyle = "transparent";
        if (numSelected > 0) t.strokeStyle = this.color;
        t.beginPath();
        t.arc(x, y, size / 2, 0, Math.PI * 2);
        t.stroke();
        t.fill();
      } else if (!isMissile) {
        if (numSelected > 0) {
          t.fillRect(x - size / 2 - 0.5, y - size / 2 - 0.5, size + 1, size + 1);
        }
        t.fillRect(x - size / 2, y - size / 2, size, size);
      }
      t.drawImage(spritesheet, this.category * 50, typeCategories[this.category].indexOf(this.typeName) * 50,
        50, 50, x - size / 2, y - size / 2, size, size);
      t.fillStyle = "#fff";
      t.font = "3px sans-serif";
      t.textAlign = "center";
      var text = number;
      if (numSelected > 0) text = numSelected + "/" + number;
      t.fillText(text, x + size / 6, y - size / 6);
      if (map[mx][my].passengersOn(this.typeName) > 0) {
        t.font = "2px sans-serif";
        t.fillText(map[mx][my].passengersOn(this.typeName), x + size / 6, y + size / 6);
      }
    }
  }
