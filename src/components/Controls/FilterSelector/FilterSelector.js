require('./FilterSelector.scss');
import { Component } from 'react';

class FilterSelector extends Component {

  componentWillReceiveProps(nextProps) {
    if (nextProps.layerObj && nextProps.layerObj.filterOptions) {
      let filterOptions = nextProps.layerObj.filterOptions.map((opt) => {
        const optVal = {};
        optVal[opt] = true;
        return optVal;
      });
      if (this.state && this.state.options) {
        filterOptions = filterOptions.concat([this.state.options]);
      }
      this.setState({ options: Object.assign.apply(this, filterOptions) });
    } else this.setState({ options: {} });
  }

  updateOptions(val) {
    const options = this.state.options;
    options[val] = !options[val];
    this.setState({ options });
    this.props.filterData(options);
  }

  render() {
    if (this.state && this.state.options) {
      return (
        <nav id="filter-group" className="filter-group">
          {Object.keys(this.state.options).map((val, i) =>
            (<span key={`label_${i}`}>
              <input
                type="checkbox"
                id={val}
                key={`input_${i}`}
                value={val}
                onChange={(e) => {
                  this.updateOptions(e.target.value);
                }}
                checked={this.state.options[val]}
              />
              <label htmlFor={val} key={`label_${i}`}>
                {val}
              </label>
            </span>))
          }
        </nav>
      );
    }
    return (<nav />);
  }
}

export default FilterSelector;
