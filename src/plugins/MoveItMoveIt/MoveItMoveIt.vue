<style>
.move-btn {
  padding-left: 0 !important;
  padding-right: 0 !important;
  min-width: 0;
}
</style>

<template>
  <v-card>
    <v-card-title style="padding-block: 0.2em; margin-block: 0">

      <v-row class="py-2" no-gutters v-show="visibleAxes.length" >

        <v-col v-if="defaultCustomPanel">
          <!-- hidden-sm-and-down-->
          <code-btn v-if="movePanel === 'default'" v-show="visibleAxes.length" color="primary" small code="G28" :title="$t('button.home.titleAll')" class="ml-0">
            {{ $t('button.home.captionAll') }}
          </code-btn>
          <v-btn v-if="movePanel !== 'default'" outlined color="primary" small :title="$t('button.home.titleAll')" class="ml-0" style="margin-left: 1em;" @click="movePanel = 'default'">
            Default
          </v-btn>
        </v-col>

        <v-col v-for="panel in notDefaultCustomPanels" :key="'activate-' + panel.name" align="center">
          <v-btn :outlined="movePanel !== panel.name" color="success" small :title="$t('button.home.titleAll')" class="ml-0" style="margin-left: 1em;"
                 @click="movePanel = panel.name"
          >
            {{ thingLonger(panel.name) }}
          </v-btn>
        </v-col>

        <v-col>
          <v-menu :disabled="uiFrozen">
            <template #activator="{ on }">
              <v-btn v-show="visibleAxes.length" color="primary" small class="mx-0" :disabled="uiFrozen" :elevation="1" v-on="on">
                {{ $t('panel.movement.compensation') }} <v-icon>mdi-menu-down</v-icon>
              </v-btn>
            </template>

            <v-card>
              <v-list>
                <template v-show="move.compensation">
                  <v-list-item>
                    <v-spacer></v-spacer>
                    {{ $t('panel.movement.compensationInUse', [move.compensation.type]) }}
                    <v-spacer></v-spacer>
                  </v-list-item>

                  <v-divider></v-divider>
                </template>

                <v-list-item @click="sendCode('G32')">
                  <v-icon class="mr-1">mdi-format-vertical-align-center</v-icon> {{ $t(isDelta ? 'panel.movement.runDelta' : 'panel.movement.runBed') }}
                </v-list-item>
                <v-list-item :disabled="!move.compensation.type || move.compensation.type.indexOf('Point') === -1" @click="sendCode('M561')">
                  <v-icon class="mr-1">mdi-border-none</v-icon> {{ $t('panel.movement.disableBedCompensation') }}
                </v-list-item>

                <v-divider></v-divider>

                <v-list-item @click="sendCode('G29')">
                  <v-icon class="mr-1">mdi-grid</v-icon> {{ $t('panel.movement.runMesh') }}
                </v-list-item>
                <v-list-item @click="showMeshEditDialog = true">
                  <v-icon class="mr-1">mdi-pencil</v-icon> {{ $t('panel.movement.editMesh') }}
                </v-list-item>
                <v-list-item @click="sendCode('G29 S1')">
                  <v-icon class="mr-1">mdi-content-save</v-icon> {{ $t('panel.movement.loadMesh') }}
                </v-list-item>
                <v-list-item :disabled="!isCompensationEnabled" @click="sendCode('G29 S2')">
                  <v-icon class="mr-1">mdi-grid-off</v-icon> {{ $t('panel.movement.disableMeshCompensation') }}
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </v-col>

        <v-col align="right">
          <v-btn @click="loadConfig" outlined color="primary" small class="fa fa-refresh"><v-icon class="mr-1">mdi-refresh</v-icon></v-btn>
        </v-col>
      </v-row>

    </v-card-title>

    <div v-for="(panelRow, rowIndex) in currentPanel.rows" :key="'movePanel-' + rowIndex">
      <v-card-text  v-if="panelRow === 'default-axes'" style="margin-block: 0; padding-block: 0">
        <!-- Mobile home buttons -->
        <v-row class="hidden-md-and-up py-2" no-gutters>
          <v-col>
            <code-btn color="primary" code="G28" :title="$t('button.home.titleAll')" block tile>
              {{ $t('button.home.captionAll') }}
            </code-btn>
          </v-col>
          <template v-if="!isDelta">
            <v-col v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex">
              <code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" block tile>

                {{ $t('button.home.caption', [axis.letter]) }}
              </code-btn>
            </v-col>
          </template>
        </v-row>

        <v-row v-for="(axis, axisIndex) in visibleAxes" :key="axisIndex" dense>
          <!-- Regular home buttons -->
          <v-col v-if="!isDelta" cols="auto" class="flex-shrink-1 hidden-sm-and-down">
            <code-btn :color="axis.homed ? 'primary' : 'warning'" :disabled="uiFrozen" :title="$t('button.home.title', [axis.letter])" :code="`G28 ${axis.letter}`" class="ml-0">

              {{ $t('button.home.caption', [axis.letter]) }}
            </code-btn>
          </v-col>

          <!-- Decreasing movements -->
          <v-col>
            <v-row no-gutters>
              <v-col v-for="index in numMoveSteps" :key="-index"  :class="getMoveCellClass(index - 1)">
                <code-btn :code="`M120\nG91\nG1 ${axis.letter}${-moveSteps(axis.letter)[index - 1]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, index - 1)" block tile class="move-btn">
                  <v-icon>mdi-chevron-left</v-icon> {{ axis.letter + showSign(-moveSteps(axis.letter)[index - 1]) }}
                </code-btn>
              </v-col>
            </v-row>
          </v-col>

          <!-- Increasing movements -->
          <v-col>
            <v-row no-gutters>
              <v-col v-for="index in numMoveSteps" :key="index" :class="getMoveCellClass(numMoveSteps - index)">
                <code-btn :code="`M120\nG91\nG1 ${axis.letter}${moveSteps(axis.letter)[numMoveSteps - index]} F${moveFeedrate}\nG90\nM121`" no-wait @contextmenu.prevent="showMoveStepDialog(axis.letter, numMoveSteps - index)" block tile class="move-btn">
                  {{ axis.letter + showSign(moveSteps(axis.letter)[numMoveSteps - index]) }} <v-icon>mdi-chevron-right</v-icon>
                </code-btn>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-text v-if="panelRow !== 'default-axes'" style="margin-block: 0; padding-block: 0">
        <v-row dense>
          <v-col v-for="(moveBtn, butIndex) in panelRow" :key="currentPanel.idx + '-move-btn-' + rowIndex + '-' + butIndex">
            <v-btn v-if="moveBtn.name && moveBtn.name.startsWith('mdi-')"
                   :color="moveBtn.color"
                   :disabled="uiFrozen"
                   :title="moveBtn.name"
                   class="ml-0"
                   style="width:100%;" @click="customClick(moveBtn)"
                   :outlined="moveBtn.outline"
            >
              {{ moveBtn.prefix || '' }}<v-icon>{{ moveBtn.name }}</v-icon>{{ moveBtn.suffix || '' }}
            </v-btn>
            <v-btn v-if="moveBtn.name && !moveBtn.name.startsWith('mdi-') && moveBtn.name.toLowerCase() !== 'null'"
                   :color="moveBtn.color"
                   :disabled="uiFrozen"
                   :title="moveBtn.name"
                   class="ml-0"
                   style="width:100%;"
                   @click="customClick(moveBtn)"
                   :outlined="moveBtn.outline"
            >
              {{ moveBtn.name }}
            </v-btn>
            <div v-if="!moveBtn.name && moveBtn.val" style="outline: 1px solid blue; height:100%; display: flex; align-items: center; justify-content: center;">{{ customValues[moveBtn.val] }}</div>
          </v-col>
        </v-row>
      </v-card-text>
    </div>

    <br/>

    <mesh-edit-dialog :shown.sync="showMeshEditDialog"></mesh-edit-dialog>
    <input-dialog :shown.sync="moveStepDialog.shown" :title="$t('dialog.changeMoveStep.title')" :prompt="$t('dialog.changeMoveStep.prompt')" :preset="moveStepDialog.preset" is-numeric-value @confirmed="moveStepDialogConfirmed"></input-dialog>

    <v-alert :value="unhomedAxes.length !== 0" type="warning" class="mb-0">
      {{ $tc('panel.movement.axesNotHomed', unhomedAxes.length) }}
      <strong>
        {{ unhomedAxes.map(axis => axis.letter).join(', ') }}
      </strong>
    </v-alert>

    <v-alert :value="visibleAxes.length === 0" type="info">
      {{ $t('panel.movement.noAxes') }}
    </v-alert>
  </v-card>
</template>

<script>
'use strict'

import { mapState, mapGetters, mapActions, mapMutations } from 'vuex';

// import { KinematicsName } from '../../store/machine/modelEnums.js';


export default {

  computed: {
    ...mapGetters(['isConnected', 'uiFrozen']),
    ...mapState('machine/model', ['move', 'model']),
    ...mapState('machine', ['model']),
    ...mapState('machine/settings', ['moveFeedrate']),
    ...mapGetters('machine/settings', ['moveSteps', 'numMoveSteps']),
    isCompensationEnabled() { return this.move.compensation.type.toLowerCase() !== 'none' },
    visibleAxes() { return this.move.axes.filter(axis => axis.visible); },
    isDelta() {
      // return ((this.move.kinematics.name === KinematicsName.delta) ||
      //     (this.move.kinematics.name === KinematicsName.rotaryDelta));
      return false;
    },
    unhomedAxes() { return this.move.axes.filter(axis => axis.visible && !axis.homed); },
    currentPanel() {
      return this.movePanels.find(p => p.name === this.movePanel);
    },
    defaultCustomPanel() {
      return this.movePanels.find(p => p.name === 'default');
    },
    notDefaultCustomPanels() {
      return this.movePanels.filter(p => p.name !== 'default');
    }
  },

  data() {
    return {
      showMeshEditDialog: false,
      moveStepDialog: {
        shown: false,
        axis: 'X',
        index: 0,
        preset: 0
      },

      movePanel: 'default',
      movePanels: [{ name: 'default', rows: ['default-axes'] }],
      customValues: { funkyTown: 100 }
    }
  },

  mounted() {
    window.moveitmoveit = this;
    this.moveitFixtures = {};
    (async () => {
      await this.loadConfig();
      this.loadFixtures();
    })();
  },

  methods: {
    ...mapActions('machine', ['sendCode', 'download', 'upload']),
    ...mapMutations('machine/settings', ['setMoveStep']),
    getMoveCellClass(index) {
      let classes = '';
      if (index === 0 || index === 5) {
        classes += 'hidden-lg-and-down';
      }
      if (index > 1 && index < 4 && index % 2 === 1) {
        classes += 'hidden-md-and-down';
      }
      return classes;
    },
    showSign: (value) => (value > 0) ? `+${value}` : value,
    showMoveStepDialog(axis, index) {
      this.moveStepDialog.axis = axis;
      this.moveStepDialog.index = index;
      this.moveStepDialog.preset = this.moveSteps(this.moveStepDialog.axis)[this.moveStepDialog.index];
      this.moveStepDialog.shown = true;
    },
    moveStepDialogConfirmed(value) {
      this.setMoveStep({ axis: this.moveStepDialog.axis, index: this.moveStepDialog.index, value });
    },

    thingLonger(str) {
      if (!this.charParser) this.charParser = document.createElement('textarea');
      this.charParser.innerHTML = str;
      return this.charParser.value;
    },

    async loadConfig() {
      try {
        let str = await this.download({
          filename: '0:/sys/moveItMoveItConfig.json',
          type: 'text',
          showProgress: false,
          showSuccess: false,
          showError: false
        });
        let conf = JSON.parse(str);

        let def = conf.movementPanels.find(p => p.name === 'default');
        if (!def) def = conf.movementPanels[0];
        this.movePanel = def.name;

        if (conf && conf.movementPanels && conf.movementPanels.length) {
          conf.movementPanels.forEach(panel => {
            panel.rows = panel.rows.reduce((a, row) => {
              if (row === 'compass-xyz') {
                a.push(...[
                  [ { name: 'Home X', code: 'G28 X', color: 'warning' }, { name: 'Home Y', code: 'G28 Y', color: 'warning' }, { name: 'Home Z', code: 'G28 Z', color: 'warning' } ],
                  [
                    { name: 'mdi-arrow-top-left', val: 'compass', axis:'-X,Y', color: 'success', "outline": true },
                    { name: 'mdi-arrow-up-bold', val: 'compass', axis:'Y', prefix: 'y', color: 'success' },
                    { name: 'mdi-arrow-top-right', val: 'compass', axis:'X,Y', color: 'success', "outline": true },
                    { name: 'mdi-arrow-up-bold', val: 'compass', axis:'Z', suffix: 'z', color: 'primary' }
                  ],
                  [
                    { name: 'mdi-arrow-left-bold', val: 'compass', axis:'-X', prefix: 'x', color: 'success' },
                    { val: 'compass' },
                    { name: 'mdi-arrow-right-bold', val: 'compass', axis:'X', suffix: 'x', color: 'success' },
                    { val: 'compass', color: 'primary', outline: true}
                  ],
                  [
                    { name: 'mdi-arrow-bottom-left', val: 'compass', axis:'-X,-Y', color: 'success', "outline": true },
                    { name: 'mdi-arrow-down-bold', val: 'compass', axis:'-Y', prefix: 'y', color: 'success' },
                    { name: 'mdi-arrow-bottom-right', val: 'compass', axis:'X,-Y', color: 'success', "outline": true },
                    { name: 'mdi-arrow-down-bold', val: 'compass', axis:'-Z', suffix: 'z', color: 'primary' }
                  ]]
                );
              } else {
                a.push(row);
              }
              return a;
            },[]);
          });

          conf.movementPanels.forEach((p, ip)  => (p.idx = (ip + 1)));

          this.movePanels = conf.movementPanels;
          this.templates = conf.templates || {};
          this.scripts = conf.scripts || {};
        }
      } catch (e) {
        console.log(e);
      }
    },

    async loadFixtures() {
      try {
        let str = await this.download({
          filename: '0:/sys/moveItMoveItFixtures.json',
          type: 'text',
          showProgress: false,
          showSuccess: false,
          showError: false
        });

        this.moveitFixtures = JSON.parse(str);

      } catch (e) {
        console.log(e);
      }
    },

    async saveFixtures() {
      try {
        await this.upload({
          filename: '0:/sys/moveItMoveItFixtures.json',
          content: JSON.stringify(this.moveitFixtures, null, 4),
          showProgress: false,
          showSuccess: false,
          showError: true
        });
      } catch (e) {
        console.log(e);
      }
    },

    async customClick(btn) {
      if (!window.moveitmoveit) window.moveitmoveit = this;

      let sendIt = async (c) => {
        if (c.length > 257) {
          await this.upload({
            filename: '0:/macros/moveItMoveIt_temp.g',
            content: c,
            showProgress: false,
            showSuccess: false,
            showError: true
          });

          // now run the temp file...
          c = 'M98 P"0:/macros/moveItMoveIt_temp.g"';
        }
        // console.log(c);
        await this.sendCode(c);
      }

      if (btn.set && btn.val) {
        // value setting button
        this[btn.val] = btn.set;
        this.$set(this.customValues, btn.val, btn.set);

      } else if (!btn.code && btn.val && btn.axis) {
        // running gcode based on a reference value...
        let v = this.customValues[btn.val];
        if (!v) {
          this.$makeNotification('info', 'Missing value', 'Nothing has moved as the reference value was not set', 0);
          return;
        }

        let axisStr = (a) => {
          a = a.trim();
          let neg = a.startsWith('-');
          a = a[a.length - 1];
          return a.toUpperCase() + (neg ? '-' : '') + v;
        };

        await sendIt(`M120\nG91\nG1 ${btn.axis.split(',').map(axisStr).join(' ')} F${this.moveFeedrate}\nG90\nM121`);

      } else if (btn.code && btn.code.length > 2) {
        await sendIt(btn.code);

      } else if (btn.fixture) {
        let { fixture } = btn;
        let over = fixture.endsWith(':over');
        fixture = over ? fixture.substring(0, fixture.indexOf(':')) : fixture;

        if (btn.set) {
          // set a fixture value (record machine position for all axes)
          let axes = this.model.move.axes;
          let pv = this.moveitFixtures[fixture] = {};
          axes.forEach(a => (pv[a.letter.toUpperCase()] = a.machinePosition));

          this.saveFixtures();

        } else if (this.moveitFixtures[fixture]) {
          // go to a fixture
          let pos = this.moveitFixtures[fixture];

          let axes = this.model.move.axes;

          // going to hop up to 5mm below max on Z...
          let zax = axes.find(a => a.letter === 'Z');
          if (!zax) return;

          let gcode = 'G53 G1 Z' + (zax.max - 5) + '\n'
            + 'G53 G1 X' + pos.X + ' Y' + pos.Y;

          if (!over) gcode += '\nG53 G1 Z' + pos.Z;

          sendIt(gcode);
        }

      } else if ((btn.template && this.templates[btn.template]) || (btn.script && this.scripts[btn.script])) {
        let type = btn.template ? 'template' : 'script';

        let tempStr = this[type + 's'][btn[type]];
        if (tempStr.startsWith('0:/')) {
          tempStr = await this.download({
            filename: tempStr,
            type: 'text',
            showProgress: false,
            showSuccess: false,
            showError: false
          });
        }

        // api for the script
        let params = btn.params; // eslint-disable-line
        let gcode = null;  // eslint-disable-line
        let model = this.model; // eslint-disable-line
        let sendCode = async (c) => this.sendCode(c); // eslint-disable-line
        let fixtures = this.moveitFixtures;  // eslint-disable-line
        let saveFixtures = async () => this.saveFixtures();  // eslint-disable-line

        try {
          let func = null;
          // make the functions
          if (type === 'template') {
            // make the template string evaulate as a function
            eval('func = () => {\ngcode = `' + tempStr + '`;\n}');
          } else {
            // wrap in async running function
            eval('func = async () => {\n' + tempStr + '\n}');
          }

          // run the script function...
          await func();

        } catch (e) {
          console.log(e);
        }

        if (gcode && gcode.length) {
          await sendIt(gcode);
        } else {
          console.log('NO GCODE GENERATED FROM TEMPLATE!');
        }
      }
    }
  },
  watch: {
    isConnected() {
      // Hide dialogs when the connection is interrupted
      this.showMeshEditDialog = false;
      this.moveStepDialog.shown = false;
    }
  }
}
</script>
