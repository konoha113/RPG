import React from 'react';
import { Hero } from '../types';
import { playSound } from '../utils/sound';
import { Shield, Sword, Heart, Sparkles, ShoppingBag, Coffee, ChevronRight, MessageSquareCode } from 'lucide-react';

interface TownScreenProps {
  hero: Hero;
  updateHero: (updated: Hero) => void;
  onEnterDungeon: () => void;
}

export default function TownScreen({ hero, updateHero, onEnterDungeon }: TownScreenProps) {
  const [currentTab, setCurrentTab] = React.useState<'inn' | 'shop' | 'blacksmith' | 'elder'>('inn');
  const [advisorText, setAdvisorText] = React.useState<string>(
    'ようこそ、冒険者の街へ！まずは「宿屋」で体を休めるか、「鍛冶屋」で装備を整えるのじゃ。準備ができたらダンジョンへ旅立ちなさい。'
  );

  const stats = hero.stats;

  const handleRest = () => {
    playSound('click');
    const restCost = 15;
    if (stats.gold < restCost) {
      setAdvisorText('宿屋の主人: 「おっと、お支払いのゴールドが足りないようだね。15ゴールド必要だよ」');
      return;
    }

    playSound('heal');
    const updated = {
      ...hero,
      stats: {
        ...stats,
        hp: stats.maxHp,
        mp: stats.maxMp,
        gold: stats.gold - restCost,
      },
    };
    updateHero(updated);
    setAdvisorText('宿屋の主人: 「ゆっくりおやすみ！HPとMPがすっかり全回復したよ。いってらっしゃい！」');
  };

  const buyPotion = (type: 'hp' | 'mp') => {
    playSound('click');
    const cost = 40;
    if (stats.gold < cost) {
      setAdvisorText('道具屋: 「ゴールドが足りねえな。ポーションは1個40ゴールドだぞ」');
      return;
    }

    playSound('pickup');
    const updated = { ...hero };
    updated.stats.gold -= cost;
    if (type === 'hp') {
      updated.inventory.potions += 1;
      setAdvisorText('道具屋: 「まいどあり！傷を癒やす回復ポーション(HP50%回復)だ！」');
    } else {
      updated.inventory.mpPotions += 1;
      setAdvisorText('道具屋: 「まいどあり！魔力を高める魔力ポーション(MP50%回復)だ！」');
    }
    updateHero(updated);
  };

  const sellUpgradeStone = () => {
    playSound('click');
    if (hero.inventory.upgradeStones <= 0) {
      setAdvisorText('道具屋: 「売るための強化石を持ってないようだな」');
      return;
    }

    playSound('pickup');
    const updated = { ...hero };
    updated.inventory.upgradeStones -= 1;
    updated.stats.gold += 80;
    updateHero(updated);
    setAdvisorText('道具屋: 「お、いい輝きの強化石だな！80ゴールドで買い取らせてもらったぞ！」');
  };

  // Blacksmith logic - upgrades gear
  const getUpgradeCost = (currentLvl: number) => {
    return (currentLvl + 1) * 60;
  };

  const getUpgradeStoneCost = (currentLvl: number) => {
    return Math.floor(currentLvl / 2) + 1;
  };

  const upgradeEquipment = (type: 'weapon' | 'armor') => {
    playSound('click');
    const currentLvl = type === 'weapon' ? hero.weaponUpgrade : hero.armorUpgrade;
    const goldCost = getUpgradeCost(currentLvl);
    const stoneCost = getUpgradeStoneCost(currentLvl);

    if (stats.gold < goldCost) {
      setAdvisorText(`鍛冶屋: 「腕は確かなんだが、ゴールドが足らねえな！${goldCost} G 必要だ！」`);
      return;
    }

    if (hero.inventory.upgradeStones < stoneCost) {
      setAdvisorText(`鍛冶屋: 「おいおい、素材の【強化石】が足りねえぞ！${stoneCost}個 持ってきな！」`);
      return;
    }

    playSound('levelup');
    const updated = { ...hero };
    updated.stats.gold -= goldCost;
    updated.inventory.upgradeStones -= stoneCost;

    if (type === 'weapon') {
      updated.weaponUpgrade += 1;
      updated.stats.atk += 3;
      setAdvisorText(`鍛冶屋: 「オラァ！武器が【+${updated.weaponUpgrade}】に鍛え上がったぜ！攻撃力が3上がった！」`);
    } else {
      updated.armorUpgrade += 1;
      updated.stats.def += 2;
      setAdvisorText(`鍛冶屋: 「よしっ！防具が【+${updated.armorUpgrade}】に強固になったぞ！防御力が2上がった！」`);
    }
    updateHero(updated);
  };

  const talkToElder = () => {
    playSound('click');
    const advises = [
      '長老: 「ダンジョンは地下5階まで続いておる。最深部には王国の脅威である魔王（マオウ）が潜んでおるはずじゃ...」',
      '長老: 「ダンジョンの「宝箱」からはゴールドだけでなく、武器の強化に必要な【強化石】が見つかることがあるぞ！」',
      '長老: 「ダンジョン内の「聖なる泉」に触れると、心身の傷が全回復する。ただし一箇所につき一度きりじゃ、注意して進みなさい。」',
      '长老: 「魔王は桁違いのHPと攻撃力を持っておる。戦闘中にピンチになったら、鍛冶屋で装備を+3以上まで鍛えるのが勝利のコツじゃ。」',
      '長老: 「モンスターとの戦いで傷ついたら惜しまずポーションを飲むのじゃ。命あっての物種じゃからな。」',
    ];
    const adv = advises[Math.floor(Math.random() * advises.length)];
    setAdvisorText(adv);
  };

  return (
    <div id="town-layout" className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-2 md:p-4 rounded-xl border border-zinc-800 font-sans shadow-inner">
      {/* Town Header Stats */}
      <div id="town-hud" className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900 border border-zinc-800 p-3 rounded-lg mb-4 text-xs">
        <div id="hud-hp" className="flex items-center space-x-2">
          <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
          <div>
            <div className="text-[10px] text-zinc-400">生命力 (HP)</div>
            <div className="font-mono text-sm">
              {stats.hp} / {stats.maxHp}
            </div>
          </div>
        </div>
        <div id="hud-mp" className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          <div>
            <div className="text-[10px] text-zinc-400">魔力 (MP)</div>
            <div className="font-mono text-sm">
              {stats.mp} / {stats.maxMp}
            </div>
          </div>
        </div>
        <div id="hud-gold" className="flex items-center space-x-2">
          <span className="w-4 h-4 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center">G</span>
          <div>
            <div className="text-[10px] text-zinc-400">所持金</div>
            <div className="font-mono text-sm text-amber-400 font-bold">{stats.gold} G</div>
          </div>
        </div>
        <div id="hud-stones" className="flex items-center space-x-2">
          <span className="w-4 h-4 text-purple-400">💎</span>
          <div>
            <div className="text-[10px] text-zinc-400">強化石</div>
            <div className="font-mono text-sm text-purple-400 font-bold">{hero.inventory.upgradeStones} 個</div>
          </div>
        </div>
      </div>

      <div id="town-advisor" className="bg-zinc-900 border-l-4 border-amber-600 p-3 rounded mb-4 min-h-[70px] flex items-start space-x-2 text-sm text-zinc-300 leading-relaxed shadow-sm">
        <span className="text-amber-500 font-bold text-base flex-shrink-0">💬</span>
        <span className="whitespace-pre-wrap">{advisorText}</span>
      </div>

      {/* Town Tabs and Control Board */}
      <div id="town-action-zone" className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-grow">
        {/* Navigation panel */}
        <div id="town-menu" className="md:col-span-3 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          <button
            id="tab-btn-inn"
            onClick={() => { playSound('click'); setCurrentTab('inn'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
              currentTab === 'inn'
                ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-md'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>冒険者の宿屋</span>
          </button>
          <button
            id="tab-btn-shop"
            onClick={() => { playSound('click'); setCurrentTab('shop'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
              currentTab === 'shop'
                ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-md'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>道具ポーション屋</span>
          </button>
          <button
            id="tab-btn-blacksmith"
            onClick={() => { playSound('click'); setCurrentTab('blacksmith'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
              currentTab === 'blacksmith'
                ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-md'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Sword className="w-4 h-4" />
            <span>武具の鍛冶屋</span>
          </button>
          <button
            id="tab-btn-elder"
            onClick={() => { playSound('click'); setCurrentTab('elder'); }}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start space-x-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
              currentTab === 'elder'
                ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-md'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <MessageSquareCode className="w-4 h-4" />
            <span>長老の館</span>
          </button>
        </div>

        {/* Tab Detail View */}
        <div id="town-tab-content" className="md:col-span-9 bg-zinc-900/40 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between min-h-[220px]">
          {currentTab === 'inn' && (
            <div id="tab-inn" className="space-y-4">
              <div id="inn-desc">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-400" />
                  冒険者の宿屋 (Inn)
                </h3>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                  15ゴールドを支払い、疲れをいやします。HPとMPが完全に回復します。
                  探索で傷つき疲れたときは、ここで休息をとるのが一番です。
                </p>
              </div>
              <div id="inn-act" className="pt-2">
                <button
                  id="action-rest-btn"
                  onClick={handleRest}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-950 px-5 py-2.5 rounded-lg font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-500/10 flex items-center space-x-1.5"
                >
                  <Coffee className="w-4 h-4" />
                  <span>15 G で一晩休む (HP/MP全回復)</span>
                </button>
              </div>
            </div>
          )}

          {currentTab === 'shop' && (
            <div id="tab-shop" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  薬屋・素材屋 (Shop)
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  冒険に不可欠な回復アイテムの売買や、手に入れた貴重な素材をゴールドに換金します。
                </p>
              </div>

              <div id="shop-catalog" className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* HP Potion */}
                <div id="item-hp-pot" className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500/20" />
                      <span>回復薬 (HPポーション)</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">HPを最大値の50%回復 (現在: {hero.inventory.potions}個)</span>
                  </div>
                  <button
                    id="buy-hp-pot-btn"
                    onClick={() => buyPotion('hp')}
                    className="bg-zinc-800 border border-zinc-700 text-amber-400 font-bold text-xs py-1.5 px-3 rounded hover:bg-zinc-750 active:scale-95 text-center min-w-[70px]"
                  >
                    40 G
                  </button>
                </div>

                {/* MP Potion */}
                <div id="item-mp-pot" className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                      <span>魔力薬 (MPポーション)</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">MPを最大値 of 50%回復 (現在: {hero.inventory.mpPotions}個)</span>
                  </div>
                  <button
                    id="buy-mp-pot-btn"
                    onClick={() => buyPotion('mp')}
                    className="bg-zinc-800 border border-zinc-700 text-amber-400 font-bold text-xs py-1.5 px-3 rounded hover:bg-zinc-750 active:scale-95 text-center min-w-[70px]"
                  >
                    40 G
                  </button>
                </div>

                {/* Sell Stones */}
                <div id="item-sell-stone" className="flex items-center justify-between p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 sm:col-span-2">
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1">
                      <span>💎 強化石の買取</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">ダンジョンで拾った強化石を1つ売却します (現在: {hero.inventory.upgradeStones}個)</span>
                  </div>
                  <button
                    id="sell-stone-btn"
                    onClick={sellUpgradeStone}
                    disabled={hero.inventory.upgradeStones <= 0}
                    className="disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800 border border-zinc-700 text-green-400 font-bold text-xs py-1.5 px-3 rounded hover:bg-zinc-750 active:scale-95 text-center min-w-[100px]"
                  >
                    +80 G で売る
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'blacksmith' && (
            <div id="tab-blacksmith" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <Sword className="w-4 h-4 text-amber-400" />
                  武具鍛冶屋 (Blacksmith)
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  宝箱から入手した【強化石】と【ゴールド】を使用して武器・防具を鍛え上げます。
                </p>
              </div>

              <div id="blacksmith-upgrade-panel" className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Upgrade Weapon */}
                <div id="upgrade-weapon-card" className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Sword className="w-3.5 h-3.5 text-zinc-400" />
                        武器強化 (+ {hero.weaponUpgrade})
                      </span>
                      <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-900/50 px-1.5 py-0.5 rounded">ATK +3</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      必要費用: <span className="text-amber-400 font-bold">{getUpgradeCost(hero.weaponUpgrade)} G</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      必要素材: <span className="text-purple-400 font-bold">強化石 × {getUpgradeStoneCost(hero.weaponUpgrade)}</span> (所持: {hero.inventory.upgradeStones})
                    </div>
                  </div>
                  <button
                    id="upgrade-weapon-btn"
                    onClick={() => upgradeEquipment('weapon')}
                    className="w-full mt-3 bg-amber-600 hover:brightness-110 text-zinc-950 font-bold text-xs py-1.5 rounded transition-all active:scale-95"
                  >
                    武器を強化する
                  </button>
                </div>

                {/* Upgrade Armor */}
                <div id="upgrade-armor-card" className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-zinc-400" />
                        防具強化 (+ {hero.armorUpgrade})
                      </span>
                      <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-900/50 px-1.5 py-0.5 rounded">DEF +2</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      必要費用: <span className="text-amber-400 font-bold">{getUpgradeCost(hero.armorUpgrade)} G</span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      必要素材: <span className="text-purple-400 font-bold">強化石 × {getUpgradeStoneCost(hero.armorUpgrade)}</span> (所持: {hero.inventory.upgradeStones})
                    </div>
                  </div>
                  <button
                    id="upgrade-armor-btn"
                    onClick={() => upgradeEquipment('armor')}
                    className="w-full mt-3 bg-amber-600 hover:brightness-110 text-zinc-950 font-bold text-xs py-1.5 rounded transition-all active:scale-95"
                  >
                    防具を強化する
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentTab === 'elder' && (
            <div id="tab-elder" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <MessageSquareCode className="w-4 h-4 text-amber-400" />
                  長老の館 (Elder)
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  王国の歩む歴史と、魔王に対抗するための真のアドバイスを知恵袋から授かります。
                </p>
              </div>
              <div id="elder-actions" className="pt-2">
                <button
                  id="elder-talk-btn"
                  onClick={talkToElder}
                  className="bg-zinc-800 border border-zinc-700 text-amber-400 hover:bg-zinc-750 px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow"
                >
                  <span>知恵を授かる (アドバイス)</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Footer Button to Start Dungeon */}
          <div id="town-footer-action" className="border-t border-zinc-800 pt-3 mt-4 flex justify-end">
            <button
              id="goto-dungeon-btn"
              onClick={onEnterDungeon}
              className="bg-red-700 hover:bg-red-600 text-zinc-100 font-bold py-2.5 px-6 rounded-lg text-xs flex items-center space-x-2 shadow-lg shadow-red-950/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>ダンジョン探索を開始する</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
