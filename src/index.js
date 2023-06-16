#!/usr/bin/env node

import args from "./src/arguments.js"
import asciichart from "asciichart"
import moment from "moment"
import lodash from "lodash/fp.js"
import { CryptoCompareAPI } from "./src/CryptoCompareAPI.js"
import { print, normalize, time, interpolate } from "./src/utils.js"
import { printTopList } from "./src/toplist.js"
import {
  printTechIndicatorChart,
  getTechIndicator,
  getTechIndicatorColors,
} from "./src/technical-indicator.js"

const { map, flow, sortBy, toLower, trim, pad, max, min } = lodash

const printCoins = async () =>
  flow(
    map(trim),
    sortBy(toLower),
    map(print)
  )(await CryptoCompareAPI.fetchCoinList())

const getMinRange = (max, min) => {
  if (max - min > args.minRange) return []
  const dist = max - min
  const range = args.minRange / 2 - dist / 2
  return [max + range, min - range]
}

const main = async () => {
  const [timePast, timeName, timeApi] = time()
  const past = moment()
    .subtract(timePast, timeName)
    .format("YYYY-MM-DD hh:mm a")

  const fullHistroy = await CryptoCompareAPI.fetchCoinHistory(
    timeApi,
    args.coin,
    args.currency,
    timePast
  )

  const history = interpolate(fullHistroy)
  const value = await CryptoCompareAPI.fetchCoinPrice(args.coin, args.currency)

  const baseLegend = `\t ${args.coin} last ${timePast} ${timeName}`
  const now = `. Now: ${value[args.currency]} ${args.currency}`
  const legend = baseLegend + ` since ${past}` + now
  const smallLegend = baseLegend + now

  const fixed = normalize(max(history))
  const fixedHist = map((x) => x.toFixed(fixed))(history).map(Number)
  const padding = pad(2 + max(fixedHist).toString().length)("")
  const [maxH, minH] = getMinRange(max(fixedHist), min(fixedHist))
  const chart = getTechIndicator(fullHistroy).concat([fixedHist])
  try {
    print(
      asciichart.plot(chart, {
        height: args.maxHeight,
        max: args.minRange ? maxH : args.max,
        min: args.minRange ? minH : args.min,
        padding: padding,
        colors: getTechIndicatorColors(),
        format: (x) => (padding + x.toFixed(fixed)).slice(-padding.length),
      })
    )
  } catch (e) {
    console.log(
      "Couldn't plot chart. Please try different width or height settings."
    )
    process.exit(1)
  }

  if (args.maxWidth > 40 && !args.disableLegend) {
    print(args.maxWidth < 65 ? smallLegend : legend)
  }

  printTechIndicatorChart(fullHistroy, padding)
}

if (args.showCoinList) {
  printCoins()
} else if (args.topList) {
  printTopList()
} else {
  main()
}
