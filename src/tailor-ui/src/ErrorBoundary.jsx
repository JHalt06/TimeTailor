import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(err, info) {
    console.error('UI error:', err, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-red-600">
          <h1 className="text-lg font-semibold mb-2">UI error</h1>
          <pre className="whitespace-pre-wrap text-sm">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
