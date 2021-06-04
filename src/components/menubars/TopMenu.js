import _ from "lodash";
import React, { Component} from "react";
import { connect } from "react-redux";
import { push } from "react-router-redux";
import {
  Grid,
  Button,
  Dropdown,
  Icon,
  Image,
  Popup,
  Progress,
} from "semantic-ui-react";
import { logout } from "../../actions/authActions";
import { toggleSidebar } from "../../actions/uiActions";
import { CustomSearch } from "../CustomSearch"; 
import {
  fetchCountStats,
  fetchWorkerAvailability,
} from "../../actions/utilActions";
import { serverAddress } from "../../api_client/apiClient";
import { fetchUserSelfDetails } from "../../actions/userActions";

export class TopMenu extends Component {
  state = {
    width: window.innerWidth,
    avatarImgSrc: "/unknown_user.jpg",
  };

  constructor(props) {
    super(props);
    this.handleResize = this.handleResize.bind(this);
  }

  handleResize() {
    this.setState({ width: window.innerWidth });
  }

  componentDidMount() {
    this.props.dispatch(fetchCountStats());
    this.props.dispatch(fetchUserSelfDetails(this.props.auth.access.user_id));

    var _dispatch = this.props.dispatch;
    this.setState({ dispatch: _dispatch });
    var intervalId = setInterval(() => {
      _dispatch(fetchWorkerAvailability(this.props.workerRunningJob));
    }, 2000);
    this.setState({ intervalId: intervalId });
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.handleResize.bind(this));
    clearInterval(this.state.intervalId);
  }

  render() {
    if (this.state.avatarImgSrc === "/unknown_user.jpg") {
      console.log(this.state.avatarImgSrc);
      if (this.props.userSelfDetails && this.props.userSelfDetails.avatar_url) {
        console.log(serverAddress + this.props.userSelfDetails.avatar_url);
        this.setState({
          avatarImgSrc: serverAddress + this.props.userSelfDetails.avatar_url,
        });
      }
    }


    let runningJobPopupProgress = null;
    if (
      this.props.workerRunningJob &&
      this.props.workerRunningJob.result &&
      this.props.workerRunningJob.result.progress
    ) {
      runningJobPopupProgress = (
        <div style={{ width: 150 }}>
          <Progress
            indicating
            progress
            percent={(
              (this.props.workerRunningJob.result.progress.current.toFixed(2) /
                this.props.workerRunningJob.result.progress.target) *
              100
            ).toFixed(0)}
          >
            Running {this.props.workerRunningJob.job_type_str} ...
          </Progress>
        </div>
      );
    }

    return (
        <Grid
          columns={3}
          style={{ backgroundColor: "#eeeeee" }}
          fixed
          size="mini"
          columns="equal"
        >
          <Grid.Row>
            <Grid.Column
              textAlign="left"
              verticalAlign="middle"
              style={{ paddingTop: 10, paddingLeft: 15 }}
            >
              <Button
                color="black"
                style={{
                  verticalAlign: "bottom",
                  padding: 2,
                }}
              >
                <Image height={30} src="/logo-white.png" />
              </Button>
            </Grid.Column>
            <Grid.Column width={10} style={{
                      paddingTop: 10,
                    }}>
              <CustomSearch/>
            </Grid.Column>
            <Grid.Column textAlign="right">
              <Popup
                trigger={
                  <Icon
                    style={{
                      paddingTop: 10,
                      paddingRight: 10,
                      paddingLeft: 10,
                    }}
                    name="circle"
                    color={!this.props.workerAvailability ? "red" : "green"}
                  />
                }
                content={
                  this.props.workerAvailability
                    ? "Worker available! You can start scanning more photos, infer face labels, auto create event albums, or regenerate auto event album titles."
                    : !this.props.workerAvailability &&
                      this.props.workerRunningJob
                    ? runningJobPopupProgress
                    : "Busy..."
                }
              />

              <Dropdown
                style={{ paddingTop: 10, paddingRight: 10, paddingLeft: 10 }}
                trigger={
                  <span>
                    <Image avatar src={this.state.avatarImgSrc} />
                    <Icon name="caret down" />
                  </span>
                }
                direction="left"
                floating
                icon={null}
              >
                <Dropdown.Menu>
                  <Dropdown.Header>
                    Logged in as <b>{this.props.auth.access.name}</b>
                  </Dropdown.Header>
                  <Dropdown.Item onClick={() => this.props.dispatch(logout())}>
                    <Icon name="sign out" />
                    <b>Logout</b>
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => this.props.dispatch(push("/settings"))}
                  >
                    <Icon name="settings" />
                    <b>Settings</b>
                  </Dropdown.Item>
                  {this.props.auth.access.is_admin && <Dropdown.Divider />}

                  {this.props.auth.access.is_admin && (
                    <Dropdown.Item
                      onClick={() => this.props.dispatch(push("/admin"))}
                    >
                      <Icon name="wrench" />
                      <b>Admin Area</b>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </Grid.Column>
          </Grid.Row>
        </Grid>
    );
  }
}





TopMenu = connect((store) => {
  return {
    showSidebar: store.ui.showSidebar,
    gridType: store.ui.gridType,

    workerAvailability: store.util.workerAvailability,
    workerRunningJob: store.util.workerRunningJob,

    auth: store.auth,
    jwtToken: store.auth.jwtToken,
    exampleSearchTerms: store.util.exampleSearchTerms,
    fetchingExampleSearchTerms: store.util.fetchingExampleSearchTerms,
    fetchedExampleSearchTerms: store.util.fetchedExampleSearchTerms,
    searchError: store.search.error,
    searchingPhotos: store.search.searchingPhotos,
    searchedPhotos: store.search.searchedPhotos,
    people: store.people.people,
    fetchingPeople: store.people.fetchingPeople,
    fetchedPeople: store.people.fetchedPeople,

    albumsThingList: store.albums.albumsThingList,
    fetchingAlbumsThingList: store.albums.fetchingAlbumsThingList,
    fetchedAlbumsThingList: store.albums.fetchedAlbumsThingList,

    albumsUserList: store.albums.albumsUserList,
    fetchingAlbumsUserList: store.albums.fetchingAlbumsUserList,
    fetchedAlbumsUserList: store.albums.fetchedAlbumsUserList,

    albumsPlaceList: store.albums.albumsPlaceList,
    fetchingAlbumsPlaceList: store.albums.fetchingAlbumsPlaceList,
    fetchedAlbumsPlaceList: store.albums.fetchedAlbumsPlaceList,
    userSelfDetails: store.user.userSelfDetails,
  };
})(TopMenu);




