import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import EventListener from 'react-event-listener';
import classnames from 'classnames';
import { bindActionCreators } from 'redux';
import { SubmissionError, change } from 'redux-form';
import { isMobile } from 'react-device-detect';
import { createSelector } from 'reselect';

import { BASE_CURRENCY, DEFAULT_COIN_DATA } from '../../config/constants';
import {
	submitOrder
} from '../../actions/orderAction';
import { getUserTrades } from '../../actions/walletActions';
import {
	changePair,
	setNotification,
	NOTIFICATIONS,
	RISKY_ORDER
} from '../../actions/appActions';

import { isLoggedIn } from '../../utils/token';
import TradeBlock from './components/TradeBlock';
import Orderbook from './components/Orderbook';
import OrderEntry from './components/OrderEntry';
import { FORM_NAME } from './components/OrderEntryForm';
import TradeHistory from './components/TradeHistory';
import MobileTrade from './MobileTrade';
import MobileChart from './MobileChart';
import TVChartContainer from './ChartContainer';
import OrdersWrapper from './components/OrdersWrapper';

import { Loader, MobileBarTabs } from '../../components';

import STRINGS from '../../config/localizedStrings';
import { playBackgroundAudioNotification } from '../../utils/utils';

class Trade extends PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			activeTab: 0,
			chartHeight: 0,
			chartWidth: 0,
			symbol: ''
		};
		this.priceTimeOut = '';
		this.sizeTimeOut = '';
	}

	componentWillMount() {
		this.setSymbol(this.props.routeParams.pair);
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.routeParams.pair !== this.props.routeParams.pair) {
			this.setSymbol(nextProps.routeParams.pair);
		}
	}

	componentWillUnmount() {
		clearTimeout(this.priceTimeOut);
		clearTimeout(this.sizeTimeOut);
	}

	setSymbol = (symbol = '') => {
		this.props.getUserTrades(symbol);
		this.props.changePair(symbol);
		this.setState({ symbol: '' }, () => {
			setTimeout(() => {
				this.setState({ symbol });
			}, 1000);
		});
	};

	onSubmitOrder = (values) => {
		return submitOrder(values)
			.then((body) => { })
			.catch((err) => {
				const _error =
					err.response && err.response.data
						? err.response.data.message
						: err.message;
				throw new SubmissionError({ _error });
			});
	};

	setChartRef = (el) => {
		if (el) {
			this.chartBlock = el;
			this.onResize();
		}
	};

	goToTransactionsHistory = () => {
		this.props.router.push('/transactions');
	};

	goToPair = (pair) => {
		this.props.router.push(`/trade/${pair}`);
	};

	onResize = () => {
		if (this.chartBlock) {
			this.setState({
				chartHeight: this.chartBlock.offsetHeight || 0,
				chartWidth: this.chartBlock.offsetWidth || 0
			});
		}
	};

	openCheckOrder = (order, onConfirm) => {
		const { setNotification, fees, pairData } = this.props;
		setNotification(NOTIFICATIONS.NEW_ORDER, {
			order,
			onConfirm,
			fees,
			pairData
		});
	};

	onRiskyTrade = (order, onConfirm) => {
		const { setNotification, fees, pairData } = this.props;
		setNotification(RISKY_ORDER, {
			order,
			onConfirm,
			fees,
			pairData
		});
	};

	onPriceClick = (price) => {
		this.props.change(FORM_NAME, 'price', price);
		playBackgroundAudioNotification('orderbook_field_update', this.props.settings);
		if (this.priceRef) {
			this.priceRef.focus();
		}
	};

	onAmountClick = (size) => {
		this.props.change(FORM_NAME, 'size', size);
		playBackgroundAudioNotification('orderbook_field_update', this.props.settings);
		if (this.sizeRef)
			this.sizeRef.focus();
	};

	setPriceRef = (priceRef) => {
		if (priceRef) {
			this.priceRef = priceRef;
		}
	};

	setSizeRef = (sizeRef) => {
		if (sizeRef) {
			this.sizeRef = sizeRef;
		}
	};

	setActiveTab = (activeTab) => {
		this.setState({ activeTab });
	};

	render() {
		const {
			pair,
			pairData,
			orderbookReady,
			balance,
			activeLanguage,
			activeTheme,
			settings,
			orderLimits,
			pairs,
			coins,
			discount,
			fees
		} = this.props;
		const {
			chartHeight,
			symbol,
			activeTab
		} = this.state;

		if (symbol !== pair || !pairData) {
			return <Loader background={false} />;
		}
		const baseValue = coins[BASE_CURRENCY] || DEFAULT_COIN_DATA;

		// TODO get right base pair
		const orderbookProps = {
			symbol,
			pairData,
			baseSymbol: baseValue.symbol.toUpperCase(),
			coins,
			onPriceClick: this.onPriceClick,
			onAmountClick: this.onAmountClick
		};

		const mobileTabs = [
			{
				title: STRINGS.TRADE_TAB_CHART,
				content: (
					<MobileChart
						pair={pair}
						pairData={pairData}
						activeLanguage={activeLanguage}
						activeTheme={activeTheme}
						symbol={symbol}
						goToPair={this.goToPair}
						orderLimits={orderLimits}
					/>
				)
			},
			{
				title: STRINGS.TRADE_TAB_TRADE,
				content: (
					<MobileTrade
						orderbookProps={orderbookProps}
						symbol={symbol}
						fees={fees}
						balance={balance}
						settings={settings}
						orderbookReady={orderbookReady}
						openCheckOrder={this.openCheckOrder}
						onRiskyTrade={this.onRiskyTrade}
						onSubmitOrder={this.onSubmitOrder}
						goToPair={this.goToPair}
						pair={pair}
						setPriceRef={this.setPriceRef}
						setSizeRef={this.setSizeRef}
					/>
				)
			},
			{
				title: STRINGS.TRADE_TAB_ORDERS,
				content: (
					<OrdersWrapper
						isLoggedIn={isLoggedIn()}
						goToTransactionsHistory={this.goToTransactionsHistory}
						pair={pair}
						pairData={pairData}
						pairs={pairs}
						coins={coins}
						goToPair={this.goToPair}
						activeTheme={activeTheme}
					/>
				)
			}
		];
		return (
			<div className={classnames('trade-container', 'd-flex')}>
				{isMobile ? (
					<div className="">
						<MobileBarTabs
							tabs={mobileTabs}
							activeTab={activeTab}
							setActiveTab={this.setActiveTab}
						/>
						<div className="content-with-bar d-flex">
							{mobileTabs[activeTab].content}
						</div>
					</div>
				) : (
						<div className={classnames('trade-container', 'd-flex')}>
							<EventListener target="window" onResize={this.onResize} />
							<div
								className={classnames(
									'trade-col_side_wrapper',
									'flex-column',
									'd-flex',
									'apply_rtl'
								)}
							>
								<TradeBlock
									isLoggedIn={isLoggedIn()}
									title={STRINGS.ORDERBOOK}
									pairData={pairData}
									pair={pair}
								>
									{orderbookReady && <Orderbook {...orderbookProps} />}
								</TradeBlock>
							</div>
							<div
								className={classnames(
									'trade-col_main_wrapper',
									'flex-column',
									'd-flex',
									'f-1',
									'overflow-x'
								)}
							>
								<div
									className={classnames(
										'trade-main_content',
										'flex-auto',
										'd-flex'
									)}
								>
									<div
										className={classnames(
											'trade-col_action_wrapper',
											'flex-column',
											'd-flex',
											'apply_rtl'
										)}
									>
										<TradeBlock
											title={STRINGS.ORDER_ENTRY}
											pairData={pairData}
											pair={pair}
										>
											<OrderEntry
												submitOrder={this.onSubmitOrder}
												openCheckOrder={this.openCheckOrder}
												onRiskyTrade={this.onRiskyTrade}
												symbol={symbol}
												balance={balance}
												fees={fees}
												showPopup={
													settings.notification
														.popup_order_confirmation
												}
												setPriceRef={this.setPriceRef}
												setSizeRef={this.setSizeRef}
											/>
										</TradeBlock>
									</div>
									<TradeBlock
										title={STRINGS.CHART}
										setRef={this.setChartRef}
										className="f-1 overflow-x"
										pairData={pairData}
										pair={pair}
									>
										{pair && chartHeight > 0 && (
											<TVChartContainer
												activeTheme={activeTheme}
												symbol={symbol}
												// tradeHistory={tradeHistory}
												pairData={pairData}
											/>
										)}
									</TradeBlock>
								</div>
								<div
									className={classnames(
										'trade-tabs_content',
										'd-flex',
										'flex-column',
										'apply_rtl'
									)}
								>
									<OrdersWrapper
										pair={pair}
										pairData={pairData}
										discount={discount}
										pairs={pairs}
										coins={coins}
										activeTheme={activeTheme}
										isLoggedIn={isLoggedIn()}
										goToTransactionsHistory={this.goToTransactionsHistory}
										goToPair={this.goToPair}
									/>
								</div>
							</div>
							<div
								className={classnames(
									'trade-col_side_wrapper',
									'flex-column',
									'd-flex',
									'apply_rtl'
								)}
							>
								<TradeBlock
									title={STRINGS.PUBLIC_SALES}
									pairData={pairData}
									pair={pair}>
									<TradeHistory
										language={activeLanguage}
									/>
								</TradeBlock>
							</div>
						</div>
					)}
			</div>
		);
	}
}

Trade.defaultProps = {
	settings: {
		notification: {}
	}
};

const getPair = state => state.app.pair
const getPairs = state => state.app.pairs
const getVerificationLevel = state => state.user.verification_level

const feesDataSelector = createSelector(getPairs, getPair, getVerificationLevel, (pairsData, pair, verification_level) => {
	const selectedPair = pairsData[pair] || { pair_base: '', pair_2: '' };
	const makerFee = selectedPair.maker_fees || {};
	const takerFee = selectedPair.taker_fees || {};
	const feesData = {
		maker_fee: makerFee[verification_level],
		taker_fee: takerFee[verification_level]
	};
	return feesData;
});

const mapStateToProps = (state) => {
	const pair = state.app.pair;
	const pairData = state.app.pairs[pair] || { pair_base: '', pair_2: '' };
	return {
		pair,
		pairData,
		pairs: state.app.pairs,
		coins: state.app.coins,
		balance: state.user.balance,
		orderbookReady: true,
		activeLanguage: state.app.language,
		activeTheme: state.app.theme,
		fees: feesDataSelector(state),
		settings: state.user.settings,
		orderLimits: state.app.orderLimits,
		discount: state.user.discount || 0
	}
};

const mapDispatchToProps = (dispatch) => ({
	getUserTrades: (symbol) => dispatch(getUserTrades({ symbol })),
	setNotification: bindActionCreators(setNotification, dispatch),
	changePair: bindActionCreators(changePair, dispatch),
	change: bindActionCreators(change, dispatch)
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Trade);
