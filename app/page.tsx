"use client"

import type React from "react"
import { useEffect } from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Trash2,
  Plus,
  Heart,
  Zap,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import * as d3 from "d3"

interface Criterion {
  id: string
  name: string
  weight: number
  category: "hot" | "crazy"
}

interface Person {
  id: string
  name: string
  scores: Record<string, number>
  hotScore: number
  crazyScore: number
  zone: string
}

const ZONES = {
  "No Go Zone": {
    x: [0, 5],
    y: [0, 10],
    shape: "rectangle",
    description:
      "Avoid investing time here. These individuals may not meet your standards for a meaningful relationship. Focus your energy elsewhere.",
  },
  "Danger Zone": {
    x: [5, 10],
    y: [5, 10],
    shape: "triangle",
    description:
      "Proceed with caution. High attraction but potentially unstable. Keep boundaries clear and avoid sharing sensitive information early.",
  },
  "Fun Zone": {
    x: [5, 8],
    y: [0, 8],
    shape: "trapezoid",
    description:
      "Great for exciting experiences but may lack long-term stability. Enjoy the connection while being mindful of emotional boundaries.",
  },
  "Date Zone": {
    x: [8, 10],
    y: [5, 10],
    shape: "trapezoid",
    description:
      "Good for casual dating and exploring compatibility. Located below the diagonal line in the upper right quadrant.",
  },
  "Wife Zone": {
    x: [8, 10],
    y: [1, 5],
    shape: "rectangle",
    description:
      "Ideal for long-term relationships. High compatibility with good stability. Consider introducing to family and friends when appropriate.",
  },
  "Chromosome Mismatch": {
    x: [8, 10],
    y: [0, 1],
    shape: "rectangle",
    description:
      "Seems too good to be true - verify authenticity. High attraction with low complexity may indicate incomplete information or misrepresentation.",
  },
}

function getZone(x: number, y: number): string {
  // Process zones in priority order to handle overlapping boundaries

  // Chromosome Mismatch: Rectangle X=8-10, Y=0-1
  if (x >= 8 && x <= 10 && y >= 0 && y <= 1) return "Chromosome Mismatch"

  // Wife Zone: Rectangle X=8-10, Y=1-5
  if (x >= 8 && x <= 10 && y >= 1 && y <= 5) return "Wife Zone"

  // Date Zone: Trapezoid with diagonal top boundary
  if (x >= 8 && x <= 10 && y >= 5 && y <= 10) {
    if (y <= x) return "Date Zone" // Below diagonal line y=x (which goes from 8,8 to 10,10 in this range)
  }

  // Danger Zone: Triangle - above diagonal line y=x in the 5-10, 5-10 area
  if (x >= 5 && x <= 10 && y >= 5 && y <= 10) {
    if (y >= x) return "Danger Zone" // Above diagonal line y=x
  }

  // Fun Zone: Area between X=5-8, Y=0-8, excluding Danger Zone
  if (x >= 5 && x <= 8 && y >= 0 && y <= 8) {
    if (y < 5 || (y >= 5 && y < x)) return "Fun Zone" // Below Danger Zone
  }

  // No Go Zone: Rectangle X=0-5, Y=0-10 (default for remaining area)
  if (x >= 0 && x <= 5 && y >= 0 && y <= 10) return "No Go Zone"

  return "Unknown Zone"
}

const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="w-full max-w-md mx-auto mb-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-muted-foreground">
        Step {currentStep} of {totalSteps}
      </span>
      <span className="text-sm font-medium text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      />
    </div>
  </div>
)

const LoadingSpinner = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center p-4">
    <div className="flex items-center gap-3">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="text-muted-foreground">{message}</span>
    </div>
  </div>
)

const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

const D3Chart = ({ people }: { people: Person[] }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement
      if (container) {
        const containerWidth = container.clientWidth
        const newWidth = Math.min(containerWidth - 40, 800)
        const newHeight = (newWidth * 3) / 4
        setDimensions({ width: newWidth, height: newHeight })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 40 }
    const chartWidth = dimensions.width - margin.left - margin.right
    const chartHeight = dimensions.height - margin.top - margin.bottom

    const xScale = d3.scaleLinear().domain([0, 10]).range([0, chartWidth])
    const yScale = d3.scaleLinear().domain([0, 10]).range([chartHeight, 0])

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Zone boundaries
    const zones = [
      {
        name: "No Go Zone",
        path: `M${xScale(0)},${yScale(0)} L${xScale(5)},${yScale(0)} L${xScale(5)},${yScale(10)} L${xScale(0)},${yScale(10)} Z`,
        fill: "transparent",
        labelX: xScale(2.5),
        labelY: yScale(5),
      },
      {
        name: "Danger Zone",
        path: `M${xScale(5)},${yScale(5)} L${xScale(5)},${yScale(10)} L${xScale(10)},${yScale(10)} Z`,
        fill: "transparent",
        labelX: xScale(6.7),
        labelY: yScale(8.3),
      },
      {
        name: "Fun Zone",
        path: `M${xScale(5)},${yScale(0)} L${xScale(8)},${yScale(0)} L${xScale(8)},${yScale(8)} L${xScale(5)},${yScale(5)} Z`,
        fill: "transparent",
        labelX: xScale(6.5),
        labelY: yScale(3),
      },
      {
        name: "Date Zone",
        path: `M${xScale(8)},${yScale(5)} L${xScale(10)},${yScale(5)} L${xScale(10)},${yScale(10)} L${xScale(8)},${yScale(8)} Z`,
        fill: "transparent",
        labelX: xScale(9),
        labelY: yScale(7),
      },
      {
        name: "Wife Zone",
        path: `M${xScale(8)},${yScale(1)} L${xScale(10)},${yScale(1)} L${xScale(10)},${yScale(5)} L${xScale(8)},${yScale(5)} Z`,
        fill: "transparent",
        labelX: xScale(9),
        labelY: yScale(3),
      },
      {
        name: "Chromosome Mismatch",
        path: `M${xScale(8)},${yScale(0)} L${xScale(10)},${yScale(0)} L${xScale(10)},${yScale(1)} L${xScale(8)},${yScale(1)} Z`,
        fill: "transparent",
        labelX: xScale(9),
        labelY: yScale(0.5),
      },
    ]

    zones.forEach((zone) => {
      g.append("path").attr("d", zone.path).attr("fill", zone.fill).attr("stroke", "#e5e7eb").attr("stroke-width", 1)

      g.append("text")
        .attr("x", zone.labelX)
        .attr("y", zone.labelY)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#374151")
        .style("pointer-events", "none")
        .text(zone.name)
    })

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .append("text")
      .attr("x", chartWidth / 2)
      .attr("y", 35)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Hot Score")

    g.append("g")
      .call(d3.axisLeft(yScale))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -25)
      .attr("x", -chartHeight / 2)
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .text("Crazy Score")

    // Plot people
    g.selectAll(".person")
      .data(people)
      .enter()
      .append("circle")
      .attr("class", "person")
      .attr("cx", (d) => xScale(d.hotScore))
      .attr("cy", (d) => yScale(d.crazyScore))
      .attr("r", 6)
      .attr("fill", "#3b82f6")
      .attr("stroke", "#1e40af")
      .attr("stroke-width", 2)

    // Add labels
    g.selectAll(".person-label")
      .data(people)
      .enter()
      .append("text")
      .attr("class", "person-label")
      .attr("x", (d) => xScale(d.hotScore))
      .attr("y", (d) => yScale(d.crazyScore) - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text((d) => d.name)
  }, [people, dimensions])

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border rounded-lg bg-white"
        role="img"
        aria-label="Hot vs Crazy relationship compatibility chart"
      />
    </div>
  )
}

const HotCriteriaPage = ({
  hotCriteria,
  newHotCriterionName,
  hotWeightSum,
  onCriterionChange,
  onKeyPress,
  onAddCriterion,
  onUpdateWeight,
  onRemoveCriterion,
  onNormalizeWeights,
  onBack,
  onNext,
}: {
  hotCriteria: Criterion[]
  newHotCriterionName: string
  hotWeightSum: number
  onCriterionChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddCriterion: () => void
  onUpdateWeight: (id: string, weight: number) => void
  onRemoveCriterion: (id: string) => void
  onNormalizeWeights: () => void
  onBack: () => void
  onNext: () => void
}) => {
  const isWeightValid = Math.abs(hotWeightSum - 1) < 0.01
  const canProceed = hotCriteria.length > 0 && isWeightValid

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack()
      } else if (e.key === "Enter" && canProceed) {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [onNext, onBack, canProceed])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ProgressIndicator currentStep={3} totalSteps={5} />

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Define Hot Criteria</h1>
        <p className="text-lg text-muted-foreground">
          Add characteristics that make someone attractive to you. Weight each by importance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Hot Criterion</CardTitle>
          <CardDescription>
            Physical traits, behaviors, and characteristics that attract you - Higher is better!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g., Physical Fitness, Sense of Humor, Intelligence..."
              value={newHotCriterionName}
              onChange={onCriterionChange}
              onKeyPress={onKeyPress}
            />
            <Button onClick={onAddCriterion} disabled={!newHotCriterionName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Total Weight:</span>
              <Badge variant={isWeightValid ? "default" : "destructive"}>{(hotWeightSum * 100).toFixed(0)}%</Badge>
              {!isWeightValid && <span className="text-sm text-muted-foreground">(Should equal 100%)</span>}
            </div>
            <Button variant="outline" size="sm" onClick={onNormalizeWeights} disabled={hotCriteria.length === 0}>
              Auto-Balance
            </Button>
          </div>

          {/* Add error message when weights don't sum to 100% */}
          {!isWeightValid && hotCriteria.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Weight Validation Error</AlertTitle>
              <AlertDescription>
                All criteria weights must sum to exactly 100% before you can continue. Current total:{" "}
                {(hotWeightSum * 100).toFixed(0)}%
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {hotCriteria.map((criterion) => (
              <div key={criterion.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{criterion.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[criterion.weight * 100]}
                      onValueChange={([value]) => onUpdateWeight(criterion.id, value)}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{(criterion.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveCriterion(criterion.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {hotCriteria.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hot criteria added yet. Add some characteristics that attract you!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        {/* Disable next button when weights don't sum to 100% */}
        <Button onClick={onNext} disabled={!canProceed}>
          Next: Crazy Criteria
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {!isWeightValid && hotCriteria.length > 0
            ? "Weights must sum to 100% to continue"
            : "Press Esc to go back, Enter to continue"}
        </p>
      </div>
    </div>
  )
}

const CrazyCriteriaPage = ({
  crazyCriteria,
  newCrazyCriterionName,
  crazyWeightSum,
  onCriterionChange,
  onKeyPress,
  onAddCriterion,
  onUpdateWeight,
  onRemoveCriterion,
  onNormalizeWeights,
  onBack,
  onNext,
}: {
  crazyCriteria: Criterion[]
  newCrazyCriterionName: string
  crazyWeightSum: number
  onCriterionChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddCriterion: () => void
  onUpdateWeight: (id: string, weight: number) => void
  onRemoveCriterion: (id: string) => void
  onNormalizeWeights: () => void
  onBack: () => void
  onNext: () => void
}) => {
  const isWeightValid = Math.abs(crazyWeightSum - 1) < 0.01
  const canProceed = crazyCriteria.length > 0 && isWeightValid

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack()
      } else if (e.key === "Enter" && canProceed) {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [onNext, onBack, canProceed])

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-4">
        <ProgressIndicator currentStep={4} totalSteps={5} />

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Define Crazy Criteria</h1>
          <p className="text-lg text-muted-foreground">
            Add traits that indicate instability or unpredictability. Weight each by importance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Add Crazy Criterion
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Red flags and behaviors that indicate potential relationship challenges</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Personality traits and red flags that indicate instability - Lower is better!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., Jealousy, Mood Swings, Drama, Impulsiveness..."
                value={newCrazyCriterionName}
                onChange={onCriterionChange}
                onKeyPress={onKeyPress}
              />
              <Button onClick={onAddCriterion} disabled={!newCrazyCriterionName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Weight:</span>
                <Badge variant={isWeightValid ? "default" : "destructive"}>{(crazyWeightSum * 100).toFixed(0)}%</Badge>
                {!isWeightValid && <span className="text-sm text-muted-foreground">(Should equal 100%)</span>}
              </div>
              <Button variant="outline" size="sm" onClick={onNormalizeWeights} disabled={crazyCriteria.length === 0}>
                Auto-Balance
              </Button>
            </div>

            {/* Add error message when weights don't sum to 100% */}
            {!isWeightValid && crazyCriteria.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Weight Validation Error</AlertTitle>
                <AlertDescription>
                  All criteria weights must sum to exactly 100% before you can continue. Current total:{" "}
                  {(crazyWeightSum * 100).toFixed(0)}%
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {crazyCriteria.map((criterion) => (
                <div key={criterion.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{criterion.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[criterion.weight * 100]}
                        onValueChange={([value]) => onUpdateWeight(criterion.id, value)}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {(criterion.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveCriterion(criterion.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {crazyCriteria.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No crazy criteria added yet. Add some red flags to watch out for!</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hot Criteria
          </Button>
          {/* Disable next button when weights don't sum to 100% */}
          <Button onClick={onNext} disabled={!canProceed}>
            Next: Score People
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {!isWeightValid && crazyCriteria.length > 0
              ? "Weights must sum to 100% to continue"
              : "Press Esc to go back, Enter to continue"}
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}

const PeoplePage = ({
  criteria,
  people,
  newPersonName,
  onPersonNameChange,
  onKeyPress,
  onAddPerson,
  onRemovePerson,
  onUpdatePersonScore,
  onUpdateCriterionWeight,
  onBack,
  onNext,
}: {
  criteria: Criterion[]
  people: Person[]
  newPersonName: string
  onPersonNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onAddPerson: () => void
  onRemovePerson: (id: string) => void
  onUpdatePersonScore: (personId: string, criterionId: string, score: number) => void
  onUpdateCriterionWeight: (criterionId: string, weight: number) => void
  onBack: () => void
  onNext: () => void
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; personId: string; personName: string }>({
    isOpen: false,
    personId: "",
    personName: "",
  })

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [onBack])

  const handleDeletePerson = (personId: string, personName: string) => {
    setConfirmDialog({ isOpen: true, personId, personName })
  }

  const confirmDelete = () => {
    onRemovePerson(confirmDialog.personId)
    setConfirmDialog({ isOpen: false, personId: "", personName: "" })
  }

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-4">
        <ProgressIndicator currentStep={5} totalSteps={5} />

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Score People</h1>
          <p className="text-muted-foreground">Rate each person on your defined criteria. Scores range from 1-10.</p>
        </div>

        {people.length < 3 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Consider adding at least 3 people for meaningful comparison and better insights.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add Person to Score</CardTitle>
            <CardDescription>Enter a name and rate them on your criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter person's name..."
                value={newPersonName}
                onChange={onPersonNameChange}
                onKeyPress={onKeyPress}
              />
              <Button onClick={onAddPerson} disabled={!newPersonName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </div>
          </CardContent>
        </Card>

        {people.length > 0 && (
          <div className="grid gap-4">
            {people.map((person) => (
              <Card key={person.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{person.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePerson(person.id, person.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Hot Criteria - Higher is better!
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Rate from 1-10. Higher scores indicate more attractive traits.</p>
                          </TooltipContent>
                        </Tooltip>
                      </h4>
                      <div className="space-y-4">
                        {criteria
                          .filter((c) => c.category === "hot")
                          .map((criterion) => (
                            <div key={criterion.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium capitalize">{criterion.name}</label>
                                <span className="text-sm text-muted-foreground">
                                  Weight: {(criterion.weight * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Slider
                                  value={[person.scores[criterion.id] || 5]}
                                  onValueChange={([value]) => onUpdatePersonScore(person.id, criterion.id, value)}
                                  min={1}
                                  max={10}
                                  step={0.1}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-8 text-right">
                                  {(person.scores[criterion.id] || 5).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-secondary mb-3 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Crazy Criteria - Lower is better!
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Rate from 1-10. Lower scores indicate more stable behavior.</p>
                          </TooltipContent>
                        </Tooltip>
                      </h4>
                      <div className="space-y-4">
                        {criteria
                          .filter((c) => c.category === "crazy")
                          .map((criterion) => (
                            <div key={criterion.id} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <label className="text-sm font-medium capitalize">{criterion.name}</label>
                                <span className="text-sm text-muted-foreground">
                                  Weight: {(criterion.weight * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Slider
                                  value={[person.scores[criterion.id] || 5]}
                                  onValueChange={([value]) => onUpdatePersonScore(person.id, criterion.id, value)}
                                  min={1}
                                  max={10}
                                  step={0.1}
                                  className="flex-1"
                                />
                                <span className="text-sm font-medium w-8 text-right">
                                  {(person.scores[criterion.id] || 5).toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{person.hotScore.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">Hot Score</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-secondary">{person.crazyScore.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">Crazy Score</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{person.zone}</div>
                        <div className="text-sm text-muted-foreground">Zone</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Crazy Criteria
          </Button>
          <Button onClick={onNext} disabled={people.length === 0}>
            View Results
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Press Esc to go back</p>
        </div>

        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, personId: "", personName: "" })}
          onConfirm={confirmDelete}
          title="Delete Person"
          description={`Are you sure you want to delete ${confirmDialog.personName}? This action cannot be undone.`}
        />
      </div>
    </TooltipProvider>
  )
}

// ... existing code for IntroPage, TemplateSelectionPage, and ResultsPage ...

const IntroPage = ({ onNext }: { onNext: () => void }) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [onNext])

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ProgressIndicator currentStep={1} totalSteps={5} />

      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-foreground">Relationship Compatibility Scorer</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Create a personalized scoring system to evaluate relationship compatibility based on "Hot" and "Crazy"
          characteristics.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="text-center">
          <CardHeader>
            <Heart className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Step 1: Define Hot Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Set up physical traits, behaviors, and characteristics that attract you. Weight each criterion by
              importance. <strong>Higher is better!</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Zap className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Step 2: Define Crazy Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Identify personality traits, behaviors, and red flags that indicate instability or unpredictability.{" "}
              <strong>Lower is better!</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Step 3: Score & Analyze</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Rate people on your criteria and visualize results on the Hot vs Crazy matrix with zone classifications.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button onClick={onNext} size="lg" className="px-8">
          Get Started
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-sm text-muted-foreground mt-2">Press Enter to continue</p>
      </div>
    </div>
  )
}

const TemplateSelectionPage = ({
  onNext,
  onBack,
  onSelectTemplate,
}: {
  onNext: () => void
  onBack: () => void
  onSelectTemplate: (template: any) => void
}) => {
  const templates = [
    {
      name: "Classic Dating",
      description: "Traditional dating criteria",
      hotCriteria: [
        { name: "physical attractiveness", weight: 0.4 },
        { name: "sense of humor", weight: 0.3 },
        { name: "intelligence", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "jealousy", weight: 0.4 },
        { name: "mood swings", weight: 0.3 },
        { name: "drama", weight: 0.3 },
      ],
    },
    {
      name: "Modern Professional",
      description: "Career-focused criteria",
      hotCriteria: [
        { name: "career ambition", weight: 0.35 },
        { name: "emotional intelligence", weight: 0.35 },
        { name: "physical fitness", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "work-life imbalance", weight: 0.4 },
        { name: "financial irresponsibility", weight: 0.35 },
        { name: "communication issues", weight: 0.25 },
      ],
    },
    {
      name: "Physical Attraction",
      description: "Appearance-focused criteria",
      hotCriteria: [
        { name: "facial attractiveness", weight: 0.4 },
        { name: "body type", weight: 0.35 },
        { name: "style/fashion", weight: 0.25 },
      ],
      crazyCriteria: [
        { name: "vanity", weight: 0.4 },
        { name: "body image issues", weight: 0.35 },
        { name: "superficiality", weight: 0.25 },
      ],
    },
    {
      name: "Athletic Type",
      description: "Fitness and health focused",
      hotCriteria: [
        { name: "muscle tone", weight: 0.4 },
        { name: "athletic ability", weight: 0.3 },
        { name: "height", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "gym obsession", weight: 0.4 },
        { name: "steroid use", weight: 0.35 },
        { name: "competitive aggression", weight: 0.25 },
      ],
    },
    {
      name: "Natural Beauty",
      description: "Authentic appearance focus",
      hotCriteria: [
        { name: "natural features", weight: 0.4 },
        { name: "skin quality", weight: 0.3 },
        { name: "smile", weight: 0.3 },
      ],
      crazyCriteria: [
        { name: "plastic surgery addiction", weight: 0.4 },
        { name: "makeup dependency", weight: 0.3 },
        { name: "appearance anxiety", weight: 0.3 },
      ],
    },
    {
      name: "Intellectual Match",
      description: "Mind over matter approach",
      hotCriteria: [
        { name: "conversation skills", weight: 0.4 },
        { name: "education level", weight: 0.35 },
        { name: "eye contact", weight: 0.25 },
      ],
      crazyCriteria: [
        { name: "know-it-all attitude", weight: 0.4 },
        { name: "condescending behavior", weight: 0.35 },
        { name: "overthinking", weight: 0.25 },
      ],
    },
  ]

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack()
      } else if (e.key === "Enter") {
        onNext()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("resize", handleKeyPress)
  }, [onNext, onBack])

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate(template)
    onNext()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <ProgressIndicator currentStep={2} totalSteps={5} />

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Choose a Template</h1>
        <p className="text-lg text-muted-foreground">
          Select a pre-defined template to get started quickly, or skip to create your own criteria from scratch.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <h4 className="font-semibold text-xs text-primary mb-1">Hot Criteria:</h4>
                <div className="space-y-1">
                  {template.hotCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="capitalize">{criterion.name}</span>
                      <span className="text-muted-foreground">{(criterion.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-xs text-primary mb-1">Crazy Criteria:</h4>
                <div className="space-y-1">
                  {template.crazyCriteria.map((criterion, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="capitalize">{criterion.name}</span>
                      <span className="text-muted-foreground">{(criterion.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => handleSelectTemplate(template)} className="w-full mt-3 text-sm py-2">
                Use This Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="ghost" onClick={onNext}>
          Skip Templates
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Press Esc to go back, Enter to skip templates</p>
      </div>
    </div>
  )
}

const ResultsPage = ({
  people,
  criteria,
  onBack,
  onReset,
}: {
  people: Person[]
  criteria: Criterion[]
  onBack: () => void
  onReset: () => void
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])

  const zoneStats = Object.entries(
    people.reduce(
      (acc, person) => {
        acc[person.zone] = (acc[person.zone] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    ),
  )

  const exportToPDF = async () => {
    setIsLoading(true)
    // Simulate PDF generation
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const element = document.createElement("a")
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," +
        encodeURIComponent(
          `Relationship Compatibility Report\n\n${people
            .map((p) => `${p.name}: Hot ${p.hotScore.toFixed(1)}, Crazy ${p.crazyScore.toFixed(1)}, Zone: ${p.zone}`)
            .join("\n")}`,
        ),
    )
    element.setAttribute("download", "relationship-report.txt")
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    setIsLoading(false)
  }

  const exportToCSV = () => {
    const csvContent = [
      ["Name", "Hot Score", "Crazy Score", "Zone", ...criteria.map((c) => c.name)],
      ...people.map((person) => [
        person.name,
        person.hotScore.toFixed(1),
        person.crazyScore.toFixed(1),
        person.zone,
        ...criteria.map((c) => person.scores[c.id]?.toFixed(1) || "0"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const element = document.createElement("a")
    element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent))
    element.setAttribute("download", "relationship-data.csv")
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const togglePersonComparison = (personId: string) => {
    setSelectedPeople((prev) => (prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]))
  }

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Compatibility Results</h1>
          <p className="text-xl text-muted-foreground">
            Analysis of {people.length} {people.length === 1 ? "person" : "people"} across your criteria
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-lg">Total People</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{people.length}</div>
              <p className="text-sm text-muted-foreground">Evaluated individuals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-lg">Zone Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {zoneStats.map(([zone, count]) => (
                  <div key={zone} className="flex justify-between text-sm">
                    <span>{zone}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-lg">Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                {people.filter((p) => p.zone === "Wife Zone").length > 0 && (
                  <p className="text-green-600">✓ {people.filter((p) => p.zone === "Wife Zone").length} in Wife Zone</p>
                )}
                {people.filter((p) => p.zone === "Danger Zone").length > 0 && (
                  <p className="text-red-600">
                    ⚠ {people.filter((p) => p.zone === "Danger Zone").length} in Danger Zone
                  </p>
                )}
                {people.length < 3 && <p className="text-amber-600">Consider adding more people for better insights</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Export & Share
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export your results for analysis or sharing</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportToPDF} disabled={isLoading}>
                {isLoading ? <LoadingSpinner message="Generating PDF..." /> : "Export PDF Report"}
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                Export CSV Data
              </Button>
              <Button variant="outline" onClick={() => setComparisonMode(!comparisonMode)}>
                {comparisonMode ? "Exit Comparison" : "Compare People"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Mode */}
        {comparisonMode && (
          <Card>
            <CardHeader>
              <CardTitle>Comparison Mode</CardTitle>
              <CardDescription>Select people to compare side-by-side</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {people.map((person) => (
                  <div key={person.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`compare-${person.id}`}
                      checked={selectedPeople.includes(person.id)}
                      onChange={() => togglePersonComparison(person.id)}
                      className="rounded"
                    />
                    <label htmlFor={`compare-${person.id}`} className="text-sm font-medium">
                      {person.name}
                    </label>
                  </div>
                ))}
              </div>

              {selectedPeople.length >= 2 && (
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {people
                    .filter((p) => selectedPeople.includes(p.id))
                    .map((person) => (
                      <Card key={person.id} className="border-2 border-primary">
                        <CardHeader>
                          <CardTitle className="text-lg">{person.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Hot Score:</span>
                              <span className="font-bold text-primary">{person.hotScore.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Crazy Score:</span>
                              <span className="font-bold text-secondary">{person.crazyScore.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Zone:</span>
                              <span className="font-bold">{person.zone}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Hot vs Crazy Matrix</CardTitle>
            <CardDescription>Visual representation of all scored individuals</CardDescription>
          </CardHeader>
          <CardContent>
            <D3Chart people={people} />
          </CardContent>
        </Card>

        {/* Individual Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Summary</CardTitle>
            <CardDescription>Detailed breakdown for each person</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {people.map((person) => (
                <div key={person.id} className="p-4 bg-muted rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{person.name}</h3>
                      <p className="text-sm text-muted-foreground">Zone: {person.zone}</p>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{person.hotScore.toFixed(1)}</div>
                        <div className="text-muted-foreground">Hot</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary">{person.crazyScore.toFixed(1)}</div>
                        <div className="text-muted-foreground">Crazy</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scoring
          </Button>
          <Button variant="destructive" onClick={onReset}>
            Start Over
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default function RelationshipScorer() {
  // ... existing code for state and handlers ...
  const [currentPage, setCurrentPage] = useState<"intro" | "templates" | "hot" | "crazy" | "people" | "results">(
    "intro",
  )
  const [hotCriteria, setHotCriteria] = useState<Criterion[]>([])
  const [crazyCriteria, setCrazyCriteria] = useState<Criterion[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [newHotCriterionName, setNewHotCriterionName] = useState("")
  const [newCrazyCriterionName, setNewCrazyCriterionName] = useState("")
  const [newPersonName, setNewPersonName] = useState("")

  // ... existing code for all the handler functions ...

  const addHotCriterion = () => {
    if (newHotCriterionName.trim()) {
      const newCriterion: Criterion = {
        id: Date.now().toString(),
        name: newHotCriterionName.trim(),
        weight: 0.1,
        category: "hot",
      }
      setHotCriteria([...hotCriteria, newCriterion])
      setNewHotCriterionName("")
    }
  }

  const addCrazyCriterion = () => {
    if (newCrazyCriterionName.trim()) {
      const newCriterion: Criterion = {
        id: Date.now().toString(),
        name: newCrazyCriterionName.trim(),
        weight: 0.1,
        category: "crazy",
      }
      setCrazyCriteria([...crazyCriteria, newCriterion])
      setNewCrazyCriterionName("")
    }
  }

  const addPerson = () => {
    if (newPersonName.trim()) {
      const allCriteria = [...hotCriteria, ...crazyCriteria]
      const scores: Record<string, number> = {}
      allCriteria.forEach((criterion) => {
        scores[criterion.id] = 5
      })

      const hotScore = hotCriteria.reduce((sum, criterion) => {
        return sum + (scores[criterion.id] || 5) * criterion.weight
      }, 0)

      const crazyScore = crazyCriteria.reduce((sum, criterion) => {
        return sum + (scores[criterion.id] || 5) * criterion.weight
      }, 0)

      const newPerson: Person = {
        id: Date.now().toString(),
        name: newPersonName.trim(),
        scores,
        hotScore,
        crazyScore,
        zone: getZone(hotScore, crazyScore),
      }

      setPeople([...people, newPerson])
      setNewPersonName("")
    }
  }

  const updatePersonScore = (personId: string, criterionId: string, score: number) => {
    setPeople(
      people.map((person) => {
        if (person.id === personId) {
          const updatedScores = { ...person.scores, [criterionId]: score }
          const hotScore = hotCriteria.reduce((sum, criterion) => {
            return sum + (updatedScores[criterion.id] || 5) * criterion.weight
          }, 0)
          const crazyScore = crazyCriteria.reduce((sum, criterion) => {
            return sum + (updatedScores[criterion.id] || 5) * criterion.weight
          }, 0)
          return {
            ...person,
            scores: updatedScores,
            hotScore,
            crazyScore,
            zone: getZone(hotScore, crazyScore),
          }
        }
        return person
      }),
    )
  }

  const updateHotWeight = (id: string, weight: number) => {
    setHotCriteria(
      hotCriteria.map((criterion) => (criterion.id === id ? { ...criterion, weight: weight / 100 } : criterion)),
    )
  }

  const updateCrazyWeight = (id: string, weight: number) => {
    setCrazyCriteria(
      crazyCriteria.map((criterion) => (criterion.id === id ? { ...criterion, weight: weight / 100 } : criterion)),
    )
  }

  const removeHotCriterion = (id: string) => {
    setHotCriteria(hotCriteria.filter((criterion) => criterion.id !== id))
  }

  const removeCrazyCriterion = (id: string) => {
    setCrazyCriteria(crazyCriteria.filter((criterion) => criterion.id !== id))
  }

  const removePerson = (id: string) => {
    setPeople(people.filter((person) => person.id !== id))
  }

  const normalizeHotWeights = () => {
    const totalWeight = hotCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)
    if (totalWeight > 0) {
      setHotCriteria(
        hotCriteria.map((criterion) => ({
          ...criterion,
          weight: criterion.weight / totalWeight,
        })),
      )
    }
  }

  const normalizeCrazyWeights = () => {
    const totalWeight = crazyCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)
    if (totalWeight > 0) {
      setCrazyCriteria(
        crazyCriteria.map((criterion) => ({
          ...criterion,
          weight: criterion.weight / totalWeight,
        })),
      )
    }
  }

  const selectTemplate = (template: any) => {
    const hotCriteriaFromTemplate = template.hotCriteria.map((criterion: any, index: number) => ({
      id: `hot-${Date.now()}-${index}`,
      name: criterion.name,
      weight: criterion.weight,
      category: "hot" as const,
    }))

    const crazyCriteriaFromTemplate = template.crazyCriteria.map((criterion: any, index: number) => ({
      id: `crazy-${Date.now()}-${index}`,
      name: criterion.name,
      weight: criterion.weight,
      category: "crazy" as const,
    }))

    setHotCriteria(hotCriteriaFromTemplate)
    setCrazyCriteria(crazyCriteriaFromTemplate)
  }

  const resetApp = () => {
    setCurrentPage("intro")
    setHotCriteria([])
    setCrazyCriteria([])
    setPeople([])
    setNewHotCriterionName("")
    setNewCrazyCriterionName("")
    setNewPersonName("")
  }

  const hotWeightSum = hotCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const crazyWeightSum = crazyCriteria.reduce((sum, criterion) => sum + criterion.weight, 0)
  const allCriteria = [...hotCriteria, ...crazyCriteria]

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {currentPage === "intro" && <IntroPage onNext={() => setCurrentPage("templates")} />}

      {currentPage === "templates" && (
        <TemplateSelectionPage
          onNext={() => setCurrentPage("hot")}
          onBack={() => setCurrentPage("intro")}
          onSelectTemplate={selectTemplate}
        />
      )}

      {currentPage === "hot" && (
        <HotCriteriaPage
          hotCriteria={hotCriteria}
          newHotCriterionName={newHotCriterionName}
          hotWeightSum={hotWeightSum}
          onCriterionChange={(e) => setNewHotCriterionName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addHotCriterion)}
          onAddCriterion={addHotCriterion}
          onUpdateWeight={updateHotWeight}
          onRemoveCriterion={removeHotCriterion}
          onNormalizeWeights={normalizeHotWeights}
          onBack={() => setCurrentPage("templates")}
          onNext={() => setCurrentPage("crazy")}
        />
      )}

      {currentPage === "crazy" && (
        <CrazyCriteriaPage
          crazyCriteria={crazyCriteria}
          newCrazyCriterionName={newCrazyCriterionName}
          crazyWeightSum={crazyWeightSum}
          onCriterionChange={(e) => setNewCrazyCriterionName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addCrazyCriterion)}
          onAddCriterion={addCrazyCriterion}
          onUpdateWeight={updateCrazyWeight}
          onRemoveCriterion={removeCrazyCriterion}
          onNormalizeWeights={normalizeCrazyWeights}
          onBack={() => setCurrentPage("hot")}
          onNext={() => setCurrentPage("people")}
        />
      )}

      {currentPage === "people" && (
        <PeoplePage
          criteria={allCriteria}
          people={people}
          newPersonName={newPersonName}
          onPersonNameChange={(e) => setNewPersonName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addPerson)}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
          onUpdatePersonScore={updatePersonScore}
          onUpdateCriterionWeight={() => {}}
          onBack={() => setCurrentPage("crazy")}
          onNext={() => setCurrentPage("results")}
        />
      )}

      {currentPage === "results" && (
        <ResultsPage
          people={people}
          criteria={allCriteria}
          onBack={() => setCurrentPage("people")}
          onReset={resetApp}
        />
      )}
    </div>
  )
}
