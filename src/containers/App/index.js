import React, { Component } from 'react';
import { connect } from 'react-redux';
import io from 'socket.io-client';
import { WS_URL, ICONS } from '../../config/constants';

import { logout } from '../../actions/authAction';
import { setMe, setBalance, addTrades as addUserTrades, updateUser } from '../../actions/userAction';
import { setUserOrders, addOrder, updateOrder, removeOrder } from '../../actions/orderAction';
import { setOrderbook, addTrades } from '../../actions/orderbookAction';
import {
	setNotification, closeNotification, openContactForm,
	NOTIFICATIONS, CONTACT_FORM,
} from '../../actions/appActions';

import { checkUserSessionExpired, getToken } from '../../utils/utils';
import { AppBar, Sidebar, Dialog, Loader, MessageDisplay } from '../../components';
import { ContactForm } from '../';

class Container extends Component {
	state = {
		appLoaded: false,
		dialogIsOpen: false,
	}

	componentWillMount() {
		if (checkUserSessionExpired(localStorage.getItem('time'))) {
			this.setState({ appLoaded: false });
			this.props.logout();
		}
	}

	componentDidMount() {
		if (!this.props.fetchingAuth) {
			this.initSocketConnections();
		}
	}

	componentWillReceiveProps(nextProps) {
		if (!nextProps.fetchingAuth && nextProps.fetchingAuth !== this.props.fetchingAuth) {
			this.initSocketConnections();
		}
		if (nextProps.activeNotification.timestamp !== this.props.activeNotification.timestamp) {
			if (nextProps.activeNotification.type !== '') {
				this.onOpenDialog();
			// } else {
			// 	this.onCloseDialog();
			}
		}
	}

	initSocketConnections = () => {
		this.setPublicWS();
		this.setUserSocket(localStorage.getItem('token'));
		this.setState({ appLoaded: true });
	}

	setPublicWS = () => {
		const { symbol } = this.props;
		const publicSocket = io(`${WS_URL}/realtime`, {
			query: {
				symbol,
			}
		});

		publicSocket.on('orderbook', (data) => {
			console.log('orderbook', data)
			this.props.setOrderbook(data[symbol])
		});

		publicSocket.on('trades', (data) => {
			console.log('trades', data[symbol])
			if (data[symbol].length > 0) {
				this.props.addTrades(data[symbol]);
			}
		});
	}

	setUserSocket = (token) => {
		const privateSocket = io.connect(`${WS_URL}/user`, {
			query: {
				token: `Bearer ${token}`
			}
		});

    this.setState({ privateSocket });

		privateSocket.on('error', (error) => {
      if (error.indexOf('Access Denied') > -1) {
        this.props.logout();
      } else {
        console.error(error)
      }
		});

		privateSocket.on('user', (data) => {
			this.props.setMe(data)
		});

		privateSocket.on('orders', (data) => {
			this.props.setUserOrders(data)
		});

		privateSocket.on('wallet', (data) => {
			this.props.setBalance(data.balance)
		});

		privateSocket.on('update', ({ type, data }) => {
			console.log('update', type, data)
			switch(type) {
        case 'order_queued':
          break;
        case 'order_processed':
          break;
				case 'order_added':
					this.props.addOrder(data);
					break;
        case 'order_partialy_filled':
          alert(`order partially filled ${data.id}`);
					this.props.updateOrder(data);
  				break;
				case 'order_updated':
					this.props.updateOrder(data);
					break;
        case 'order_filled':
          alert(`orders filled: ${data.length}`);
          this.props.removeOrder(data);
          break;
				case 'order_removed':
          this.props.removeOrder(data);
          break;
				case 'trade':
				 console.log('private trade', data)
				 // "data": [
				 //    {
				 //      "price": 999,
				 //      "side": "sell",
				 //      "size": 3,
				 //      "fee": 0,
				 //      "timestamp": "2017-07-26T13:20:40.464Z"
				 //    },
				 //    ...
				 //  ],
				 //  "balance": {
				 //    "fiat_balance": 0,
				 //    "btc_balance": 300000,
				 //    "updated_at": "2017-07-26T13:20:40.464Z"
				 //  }
         this.props.addUserTrades(data);
					break;
				case 'deposit':
					this.props.setNotification(
						NOTIFICATIONS.DEPOSIT,
						`You have ${data.status ? 'received a' : 'a pending'} deposit of ${data.amount} ${data.currency}.`
					);
					break;
				case 'withdrawal':
					this.props.setNotification(
						NOTIFICATIONS.WITHDRAWAL,
						`You have performed a withdrawal of ${data.amount} ${data.currency}.`
					);
					break;
        default:
        	break;
			}
		});
  }

	goToPage = (path) => {
    this.props.router.push(path)
  }

  goToAccountPage = () => this.goToPage('/account');
	goToWalletPage = () => this.goToPage('/wallet');
	goToTradePage = () => this.goToPage('/trade');
  goToDashboard = () => this.goToPage('/');

	logout = () => this.props.logout();

	onOpenDialog = () => {
		this.setState({ dialogIsOpen: true });
	}

	onCloseDialog = () => {
		this.setState({ dialogIsOpen: false });
		this.props.closeNotification();
	}

	getClassForActivePath = (path) => {
		switch (path) {
			case '/wallet':
				return 'wallet';
			case '/account':
				return 'account';
			case '/trade':
				return 'trade';
			default:
				return '';
		}
	}

	renderDialogContent = ({ type, message, data }) => {
		switch (type) {
			case NOTIFICATIONS.ORDERS:
			case NOTIFICATIONS.DEPOSIT:
			case NOTIFICATIONS.WITHDRAWAL:
				return <MessageDisplay
					iconPath={ICONS.BELL}
					onClick={this.onCloseDialog}
					text={message}
				/>;
			case CONTACT_FORM:
				return <ContactForm onSubmitSuccess={this.onCloseDialog} />;
			default:
				return <div></div>
		}
	}

	render() {
		const { symbol, children, activeNotification } = this.props;
		const { dialogIsOpen, appLoaded } = this.state;

		const activePath = !appLoaded ? '' : this.getClassForActivePath(this.props.location.pathname);
		return (
			<div className={`app_container ${activePath} ${symbol}`}>
				{!appLoaded && <Loader />}
				<AppBar
					title={
						<div onClick={() => this.props.openContactForm()}>exir-exchange</div>
					}
					goToAccountPage={this.goToAccountPage}
					goToDashboard={this.goToDashboard}
					acccountIsActive={activePath === 'account'}
				/>
        <div className="app_container-content">
          <div className="app_container-main">
            {appLoaded && children}
          </div>
          <div className="app_container-sidebar">
            <Sidebar
							activePath={activePath}
							goToAccountPage={this.goToAccountPage}
							goToWalletPage={this.goToWalletPage}
							goToTradePage={this.goToTradePage}
							logout={this.logout}
						/>
          </div>
        </div>
				{dialogIsOpen &&
					<Dialog
						isOpen={dialogIsOpen}
						label="exir-modal"
						onCloseDialog={this.onCloseDialog}
					>
						{this.renderDialogContent(activeNotification)}
					</Dialog>
				}
			</div>
		);
	}
}

const mapStateToProps = (store) => ({
	orderbook: store.orderbook,
  symbol: store.orderbook.symbol,
	fetchingAuth: store.auth.fetching,
	activeNotification: store.app.activeNotification,
});

const mapDispatchToProps = (dispatch) => ({
    logout: () => dispatch(logout()),
		addTrades: (trades) => dispatch(addTrades(trades)),
		setOrderbook: (orderbook) => dispatch(setOrderbook(orderbook)),
		setMe: (user) => dispatch(setMe(user)),
		setBalance: (balance) => dispatch(setBalance(balance)),
		setUserOrders: (orders) => dispatch(setUserOrders(orders)),
		addOrder: (order) => dispatch(addOrder(order)),
		updateOrder: (order) => dispatch(updateOrder(order)),
		removeOrder: (order) => dispatch(removeOrder(order)),
		addUserTrades: (trades) => dispatch(addUserTrades(trades)),
		updateUser: (userData) => dispatch(updateUser(userData)),
		closeNotification: () => dispatch(closeNotification()),
		openContactForm: (data) => dispatch(openContactForm(data)),
		setNotification: (type, message) => dispatch(setNotification(type, message)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Container);
